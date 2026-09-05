import prisma from '../config/db';
import {
  CreateTimeOffTypeInput,
  UpdateTimeOffTypeInput,
  CreateAllocationInput,
  UpdateAllocationInput,
  CreateTimeOffRequestInput,
} from '../validators/timeoff.validator';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { TimeOffStatus, Prisma } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';

export class TimeOffService {
  // ─── 1. TIME OFF TYPES ──────────────────────────────────────

  static async listTypes() {
    return prisma.timeOffType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { requests: true, allocations: true } },
      },
    });
  }

  static async getTypeById(id: string) {
    const type = await prisma.timeOffType.findUnique({ where: { id } });
    if (!type) throw new NotFoundError('Time Off Type');
    return type;
  }

  static async createType(input: CreateTimeOffTypeInput) {
    const existing = await prisma.timeOffType.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('A time off type with this name already exists');
    return prisma.timeOffType.create({ data: input });
  }

  static async updateType(id: string, input: UpdateTimeOffTypeInput) {
    const existing = await prisma.timeOffType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Time Off Type');
    return prisma.timeOffType.update({ where: { id }, data: input });
  }

  static async deleteType(id: string) {
    const existing = await prisma.timeOffType.findUnique({
      where: { id },
      include: { _count: { select: { requests: true, allocations: true } } },
    });
    if (!existing) throw new NotFoundError('Time Off Type');
    if (existing._count.requests > 0 || existing._count.allocations > 0) {
      throw new ConflictError('Cannot delete time off type with existing allocations or requests');
    }
    await prisma.timeOffType.delete({ where: { id } });
    return { success: true, message: 'Time off type deleted' };
  }

  // ─── 2. ALLOCATIONS ──────────────────────────────────────────

  static async listAllocations(filters: { employeeId?: string; validityYear?: number }, user: AuthUser) {
    const where: Prisma.TimeOffAllocationWhereInput = {};

    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) return [];
      where.employeeId = user.employeeId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.validityYear) {
      where.validityYear = Number(filters.validityYear);
    }

    return prisma.timeOffAllocation.findMany({
      where,
      orderBy: [{ validityYear: 'desc' }, { timeOffType: { name: 'asc' } }],
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        timeOffType: true,
      },
    });
  }

  static async createAllocation(input: CreateAllocationInput) {
    const existing = await prisma.timeOffAllocation.findUnique({
      where: {
        employeeId_timeOffTypeId_validityYear: {
          employeeId: input.employeeId,
          timeOffTypeId: input.timeOffTypeId,
          validityYear: input.validityYear,
        },
      },
    });

    if (existing) {
      throw new ConflictError('An allocation already exists for this employee, leave type, and year');
    }

    const remaining = input.allocated; // initially taken = 0, remaining = allocated

    return prisma.timeOffAllocation.create({
      data: {
        ...input,
        taken: 0,
        remaining,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        timeOffType: true,
      },
    });
  }

  static async updateAllocation(id: string, input: UpdateAllocationInput) {
    const existing = await prisma.timeOffAllocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Time Off Allocation');

    const allocated = input.allocated !== undefined ? input.allocated : existing.allocated;
    const taken = input.taken !== undefined ? input.taken : existing.taken;
    const remaining = allocated - taken;

    return prisma.timeOffAllocation.update({
      where: { id },
      data: {
        allocated,
        taken,
        remaining,
        status: input.status !== undefined ? input.status : existing.status,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        timeOffType: true,
      },
    });
  }

  // ─── 3. REQUESTS & APPROVAL ──────────────────────────────────

  static async listRequests(filters: { employeeId?: string; status?: string }, user: AuthUser) {
    const where: Prisma.TimeOffRequestWhereInput = {};

    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) return [];
      where.employeeId = user.employeeId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status as TimeOffStatus;
    }

    return prisma.timeOffRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            jobPosition: true,
            department: { select: { name: true } },
          },
        },
        timeOffType: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async createRequest(input: CreateTimeOffRequestInput, user: AuthUser) {
    const targetEmployeeId = input.employeeId || user.employeeId;
    if (!targetEmployeeId) throw new ForbiddenError('No employee account linked');

    if (user.role === 'EMPLOYEE' && targetEmployeeId !== user.employeeId) {
      throw new ForbiddenError('You can only submit time-off requests for yourself');
    }

    const type = await prisma.timeOffType.findUnique({ where: { id: input.timeOffTypeId } });
    if (!type) throw new NotFoundError('Time Off Type');

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const year = startDate.getFullYear();

    // If allocation is required, verify available balance
    if (type.allocationRequired) {
      const allocation = await prisma.timeOffAllocation.findUnique({
        where: {
          employeeId_timeOffTypeId_validityYear: {
            employeeId: targetEmployeeId,
            timeOffTypeId: input.timeOffTypeId,
            validityYear: year,
          },
        },
      });

      if (!allocation) {
        throw new ValidationError(`No allocation found for '${type.name}' in year ${year}`);
      }

      if (allocation.remaining < input.duration) {
        throw new ValidationError(
          `Insufficient leave balance. Requested: ${input.duration} days, Available: ${allocation.remaining} days`
        );
      }
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        employeeId: targetEmployeeId,
        timeOffTypeId: input.timeOffTypeId,
        startDate,
        endDate,
        duration: input.duration,
        reason: input.reason,
        status: TimeOffStatus.TO_APPROVE,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        timeOffType: true,
      },
    });

    emitEvent(SocketEvents.TIMEOFF_UPDATED, request);
    return request;
  }

  /**
   * Approve a time-off request (HR Manager+)
   * Automatically updates allocation: taken += duration, remaining -= duration
   */
  static async approveRequest(id: string, user: AuthUser) {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: { timeOffType: true },
    });

    if (!request) throw new NotFoundError('Time off request');
    if (request.status === TimeOffStatus.APPROVED) {
      throw new ValidationError('This request is already approved');
    }

    const year = request.startDate.getFullYear();

    // Use transaction to update request and allocation atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update request status
      const updatedRequest = await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: TimeOffStatus.APPROVED,
          approvedById: user.id,
        },
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
          timeOffType: true,
          approvedBy: { select: { id: true, name: true } },
        },
      });

      // 2. If allocation required, deduct from allocation balance
      if (request.timeOffType.allocationRequired) {
        const allocation = await tx.timeOffAllocation.findUnique({
          where: {
            employeeId_timeOffTypeId_validityYear: {
              employeeId: request.employeeId,
              timeOffTypeId: request.timeOffTypeId,
              validityYear: year,
            },
          },
        });

        if (allocation) {
          await tx.timeOffAllocation.update({
            where: { id: allocation.id },
            data: {
              taken: allocation.taken + request.duration,
              remaining: allocation.remaining - request.duration,
            },
          });
        }
      }

      return updatedRequest;
    });

    emitEvent(SocketEvents.TIMEOFF_UPDATED, result);
    return result;
  }

  /**
   * Refuse a time-off request (HR Manager+)
   * If it was previously approved, restores the allocation balance.
   */
  static async refuseRequest(id: string, user: AuthUser) {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: { timeOffType: true },
    });

    if (!request) throw new NotFoundError('Time off request');
    if (request.status === TimeOffStatus.REFUSED) {
      throw new ValidationError('This request is already refused');
    }

    const wasApproved = request.status === TimeOffStatus.APPROVED;
    const year = request.startDate.getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: TimeOffStatus.REFUSED,
          approvedById: user.id,
        },
        include: {
          employee: { select: { id: true, name: true, employeeCode: true } },
          timeOffType: true,
          approvedBy: { select: { id: true, name: true } },
        },
      });

      // If it was previously approved, restore the deducted days
      if (wasApproved && request.timeOffType.allocationRequired) {
        const allocation = await tx.timeOffAllocation.findUnique({
          where: {
            employeeId_timeOffTypeId_validityYear: {
              employeeId: request.employeeId,
              timeOffTypeId: request.timeOffTypeId,
              validityYear: year,
            },
          },
        });

        if (allocation) {
          await tx.timeOffAllocation.update({
            where: { id: allocation.id },
            data: {
              taken: Math.max(0, allocation.taken - request.duration),
              remaining: allocation.remaining + request.duration,
            },
          });
        }
      }

      return updatedRequest;
    });

    emitEvent(SocketEvents.TIMEOFF_UPDATED, result);
    return result;
  }
}
