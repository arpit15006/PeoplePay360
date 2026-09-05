import prisma from '../config/db';
import { CreateAttendanceInput, UpdateAttendanceInput } from '../validators/attendance.validator';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { calculateWorkedHours } from '../utils/dates';
import { emitEvent, SocketEvents } from '../socket/emitter';

export interface AttendanceFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  month?: string | number;
  year?: string | number;
}

export class AttendanceService {
  /**
   * List attendances with RBAC filtering.
   * If user is EMPLOYEE, restrict to their own records.
   */
  static async listAttendance(filters: AttendanceFilters, user: AuthUser) {
    const where: Prisma.AttendanceWhereInput = {};

    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) return [];
      where.employeeId = user.employeeId;
    } else if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status as AttendanceStatus;
    }

    // Date / Period filters
    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    } else if (filters.month && filters.year) {
      const month = Number(filters.month);
      const year = Number(filters.year);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            jobPosition: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return attendances;
  }

  /**
   * Get attendance by ID
   */
  static async getAttendanceById(id: string, user: AuthUser) {
    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, employeeCode: true, department: true },
        },
      },
    });

    if (!record) throw new NotFoundError('Attendance record');

    if (user.role === 'EMPLOYEE' && record.employeeId !== user.employeeId) {
      throw new ForbiddenError('You can only access your own attendance records');
    }

    return record;
  }

  /**
   * Create or log attendance (Check-in or explicit entry)
   */
  static async createAttendance(input: CreateAttendanceInput, user: AuthUser) {
    // If employeeId not passed, default to user's employeeId
    const targetEmployeeId = input.employeeId || user.employeeId;
    if (!targetEmployeeId) {
      throw new ForbiddenError('No employee associated with this account');
    }

    // If EMPLOYEE role, cannot log attendance for someone else
    if (user.role === 'EMPLOYEE' && targetEmployeeId !== user.employeeId) {
      throw new ForbiddenError('You can only log attendance for yourself');
    }

    const dateObj = new Date(input.date);
    // Standardize to midnight UTC
    const dateMidnight = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));

    // Check if record already exists for employee and date
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: targetEmployeeId,
          date: dateMidnight,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Attendance already recorded for this date. Use update to modify check-out.');
    }

    const checkOut = input.checkOut || '18:00';
    const workedHours = calculateWorkedHours(input.checkIn, checkOut);

    // Auto-detect status if not supplied: standard check-in is 09:00
    let status = input.status || AttendanceStatus.PRESENT;
    if (!input.status) {
      const [h, m] = input.checkIn.split(':').map(Number);
      if (h > 9 || (h === 9 && m > 15)) {
        status = AttendanceStatus.LATE;
      }
    }

    const created = await prisma.attendance.create({
      data: {
        employeeId: targetEmployeeId,
        date: dateMidnight,
        checkIn: input.checkIn,
        checkOut,
        workedHours,
        status,
        notes: input.notes,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
      },
    });

    emitEvent(SocketEvents.ATTENDANCE_UPDATED, created);
    return created;
  }

  /**
   * Update / correct attendance.
   * HR Manager+ can correct status and hours.
   * Employee can only update their own checkOut on the same day.
   */
  static async updateAttendance(id: string, input: UpdateAttendanceInput, user: AuthUser) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Attendance record');

    // Manual correction is an authorised action. HR Payroll User is included
    // because the permission matrix grants them CRUD on attendance.
    const canCorrect = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(
      user.role
    );

    // A standard employee may only close out their own open record. They cannot
    // rewrite a check-in, overwrite a check-out that is already recorded, or
    // change the status: the PRD states an employee cannot edit past check-in
    // and check-out timestamps.
    if (!canCorrect) {
      if (existing.employeeId !== user.employeeId) {
        throw new ForbiddenError('You can only update your own attendance record');
      }
      if (input.status && input.status !== existing.status) {
        throw new ForbiddenError('Only authorised HR users can manually correct attendance status');
      }
      if (input.checkIn && input.checkIn !== existing.checkIn) {
        throw new ForbiddenError('Only authorised HR users can correct a check-in time');
      }
      if (input.checkOut && existing.checkOut) {
        throw new ForbiddenError('Only authorised HR users can correct a recorded check-out time');
      }
    }

    const checkIn = canCorrect ? input.checkIn || existing.checkIn : existing.checkIn;
    const checkOut = input.checkOut !== undefined ? (input.checkOut || existing.checkOut) : existing.checkOut;
    const workedHours = calculateWorkedHours(checkIn, checkOut);

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn,
        checkOut,
        workedHours,
        status: input.status !== undefined ? input.status : existing.status,
        notes: input.notes !== undefined ? input.notes : existing.notes,
      },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
      },
    });

    emitEvent(SocketEvents.ATTENDANCE_UPDATED, updated);
    return updated;
  }

  /**
   * Delete attendance (Admin only)
   */
  static async deleteAttendance(id: string) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Attendance record');

    await prisma.attendance.delete({ where: { id } });
    return { success: true, message: 'Attendance record deleted' };
  }
}
