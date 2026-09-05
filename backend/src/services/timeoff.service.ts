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
import { TimeOffStatus, Prisma, Role } from '@prisma/client';
import { emitEvent, SocketEvents } from '../socket/emitter';


/**
 * Days a request actually covers, counted inclusively from its own dates.
 *
 * The duration used to be taken from the request body and never checked, so a
 * caller could book 1 December to 31 December and declare it as one day: the
 * balance check compared against the declared figure, and approval deducted the
 * same, so a month of leave consumed a single day of allocation.
 *
 * Deriving it here makes the dates the single source of truth. Whole calendar
 * days are counted rather than working days, which matches the seeded data and
 * how the allocations were sized; excluding weekends and holidays would need a
 * holiday calendar the schema does not carry.
 */
export function durationInDays(startDate: Date, endDate: Date): number {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return Math.max(1, days);
}


/**
 * Where each role sits in the approval ladder.
 *
 * Section 3 defines the roles cumulatively — each one holds the previous role's
 * permissions plus more — so they form a hierarchy even though the document
 * never draws it. Approving leave is not listed among the things a role may do
 * to itself, and no organisation lets a manager sign off their own absence, so
 * that is the reading applied here.
 */
const ROLE_RANK: Record<Role, number> = {
  EMPLOYEE: 0,
  HR_MANAGER: 1,
  HR_PAYROLL_USER: 2,
  HR_PAYROLL_MANAGER: 3,
  ADMIN: 4,
};

/** The rank of whoever owns an employee record, or 0 when they have no account. */
async function rankOfEmployee(employeeId: string): Promise<number> {
  const account = await prisma.user.findFirst({
    where: { employeeId },
    select: { role: true },
  });
  return account ? ROLE_RANK[account.role] : 0;
}

/**
 * Decide whether `actor` may approve, refuse or allocate for `employeeId`.
 *
 * Two rules: nobody acts on their own record, and authority runs downward, so
 * an HR Manager cannot sign off a Payroll Manager's leave. Peers of equal rank
 * may cover for each other, which keeps a small team from deadlocking when the
 * only senior person is the one asking for the day off.
 */
export async function assertMayDecideFor(
  actor: AuthUser,
  employeeId: string,
  selfMessage: string
): Promise<void> {
  if (actor.employeeId && actor.employeeId === employeeId) {
    throw new ForbiddenError(selfMessage);
  }

  const subjectRank = await rankOfEmployee(employeeId);
  if (ROLE_RANK[actor.role] < subjectRank) {
    throw new ForbiddenError(
      'This record belongs to someone senior to you, so you cannot act on it.'
    );
  }
}

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

  static async createAllocation(input: CreateAllocationInput, user: AuthUser) {
    // Granting yourself leave days is the same conflict as approving your own
    // request, so it is refused for the same reason.
    await assertMayDecideFor(
      user,
      input.employeeId,
      'You cannot grant yourself a leave allocation. Someone else must approve your balance.'
    );

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

  static async updateAllocation(id: string, input: UpdateAllocationInput, user: AuthUser) {
    const existing = await prisma.timeOffAllocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Time Off Allocation');

    await assertMayDecideFor(
      user,
      existing.employeeId,
      'You cannot change your own leave allocation. Someone else must adjust your balance.'
    );

    const allocated = input.allocated !== undefined ? input.allocated : existing.allocated;
    const taken = input.taken !== undefined ? input.taken : existing.taken;

    // Remaining is derived, so nothing stopped a correction from cutting the
    // grant below the days already consumed and leaving a negative balance —
    // which then reads as leave owed back and lets no request through. Days
    // already taken are the floor.
    if (allocated < taken) {
      // Both directions land here — cutting the grant, or recording more taken
      // than was granted — so the message names whichever the caller changed.
      throw new ValidationError(
        input.taken !== undefined && input.allocated === undefined
          ? `Days taken (${taken}) cannot exceed the ${allocated} day(s) granted. Raise the allocation first.`
          : `This balance already has ${taken} day(s) taken, so it cannot be reduced to ${allocated}. ` +
            `Set it to ${taken} or more.`
      );
    }

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

    if (endDate < startDate) {
      throw new ValidationError('The end date cannot be before the start date');
    }

    const year = startDate.getUTCFullYear();

    // Derived, never taken from the caller. A request that spans a month must
    // consume a month of allocation regardless of what the body claims.
    const duration =
      type.unit === 'Hours' ? input.duration : durationInDays(startDate, endDate);

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ValidationError('Duration must be greater than zero');
    }

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

      // An allocation only becomes spendable once it is approved. Without this
      // an employee could draw against a balance still awaiting sign-off.
      if (allocation.status !== 'Approved') {
        throw new ValidationError(
          `The '${type.name}' allocation for ${year} is ${allocation.status.toLowerCase()} and cannot be used until it is approved`
        );
      }

      if (allocation.remaining < duration) {
        throw new ValidationError(
          `Insufficient leave balance. Requested: ${duration} ${type.unit.toLowerCase()}, Available: ${allocation.remaining}`
        );
      }
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        employeeId: targetEmployeeId,
        timeOffTypeId: input.timeOffTypeId,
        startDate,
        endDate,
        duration,
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

    await assertMayDecideFor(
      user,
      request.employeeId,
      'You cannot approve your own leave. Someone else with at least your authority must review it.'
    );

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

    await assertMayDecideFor(
      user,
      request.employeeId,
      'You cannot refuse your own leave. Someone else with at least your authority must review it.'
    );

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
