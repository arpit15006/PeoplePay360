import prisma from '../config/db';
import { LATE_GRACE_MINUTES } from '../attendance/sessionRules';
import { CreateAttendanceInput, UpdateAttendanceInput } from '../validators/attendance.validator';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { calculateWorkedHours, parseTimeToMinutes } from '../utils/dates';
import { emitEvent, SocketEvents } from '../socket/emitter';

/**
 * The unpaid meal break the employee's schedule defines for a given date.
 *
 * Worked hours exclude that break, so attendance agrees with the schedule the
 * employee is actually on: 09:00-18:00 against a 60 minute break is 8 hours.
 * An employee with no schedule, or a date the schedule does not cover, yields
 * 0 so the raw clocked span stands rather than an invented deduction.
 *
 * getUTCDay is deliberate: attendance dates are stored at UTC midnight, so
 * reading the local weekday would pick the wrong shift either side of it.
 */
interface ShiftContext {
  /** Unpaid meal break in minutes. */
  breakMinutes: number;
  /** Hours the schedule expects that day, net of the break. 0 on a day off. */
  scheduledHours: number;
  /** The shift's own start time, so lateness is judged against it and not 09:00. */
  startTime: string | null;
}

/**
 * Was this arrival late against the shift's own start time?
 *
 * Replaces the hardcoded 09:15 the two manual-entry paths each carried: a
 * schedule that starts at 10:00 should not mark 09:30 as late. Lateness is a
 * flag on the record rather than a status, so a late day still reports whether
 * it was worked.
 */
export function lateAgainst(checkIn: string, shiftStart: string | null): boolean {
  if (!shiftStart) return false;
  const [ch, cm] = checkIn.split(':').map(Number);
  const [sh, sm] = shiftStart.split(':').map(Number);
  if ([ch, cm, sh, sm].some(Number.isNaN)) return false;
  return ch * 60 + cm > sh * 60 + sm + LATE_GRACE_MINUTES;
}

export async function shiftContextFor(employeeId: string, date: Date): Promise<ShiftContext> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      workingSchedule: {
        select: {
          dailyShifts: {
            where: { dayOfWeek: date.getUTCDay() },
            select: {
              breakMinutes: true,
              isWorkingDay: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    },
  });

  const shift = employee?.workingSchedule?.dailyShifts[0];

  // A shift flagged as non-working carries no meal break to deduct, but someone
  // who clocked in anyway still worked, so the span is kept whole. With no
  // scheduled hours, every hour worked that day counts as overtime.
  if (!shift || !shift.isWorkingDay) {
    return { breakMinutes: 0, scheduledHours: 0, startTime: shift?.startTime ?? null };
  }

  const span =
    parseTimeToMinutes(shift.endTime) - parseTimeToMinutes(shift.startTime) - shift.breakMinutes;

  return {
    breakMinutes: shift.breakMinutes,
    scheduledHours: Math.max(0, Math.round((span / 60) * 100) / 100),
    startTime: shift.startTime,
  };
}

/** Hours worked beyond what the schedule expected, never negative. */
export function overtimeFrom(workedHours: number, scheduledHours: number): number {
  return Math.max(0, Math.round((workedHours - scheduledHours) * 100) / 100);
}

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

    // Checking in leaves the check-out empty until the employee actually
    // leaves. Defaulting it to 18:00 invented hours for someone still at work,
    // blocked them from ever checking out, and made the dashboard's missing
    // check-out count permanently zero.
    const checkOut = input.checkOut ?? '';
    const shift = await shiftContextFor(targetEmployeeId, dateMidnight);
    const workedHours = checkOut
      ? calculateWorkedHours(input.checkIn, checkOut, shift.breakMinutes)
      : 0;
    const overtimeHours = checkOut ? overtimeFrom(workedHours, shift.scheduledHours) : 0;

    // A late arrival is recorded as a flag beside the status, not instead of
    // it, so a manual entry keeps saying whether the day was worked.
    const status = input.status || AttendanceStatus.PRESENT;
    const wasLate = lateAgainst(input.checkIn, shift.startTime);

    const created = await prisma.attendance.create({
      data: {
        employeeId: targetEmployeeId,
        date: dateMidnight,
        checkIn: input.checkIn,
        checkOut,
        workedHours,
        overtimeHours,
        status,
        wasLate,
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
    const shift = await shiftContextFor(existing.employeeId, existing.date);
    const workedHours = checkOut
      ? calculateWorkedHours(checkIn, checkOut, shift.breakMinutes)
      : 0;
    const overtimeHours = checkOut ? overtimeFrom(workedHours, shift.scheduledHours) : 0;

    // An employee closing out their own open record is normal clocking. Anything
    // an authorised user changes is a correction, which the dashboard reports.
    const manuallyEdited = existing.manuallyEdited || canCorrect;

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn,
        checkOut,
        workedHours,
        overtimeHours,
        manuallyEdited,
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
