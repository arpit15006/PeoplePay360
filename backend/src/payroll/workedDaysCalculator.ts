import prisma from '../config/db';
import { getWorkingDaysInRange } from '../utils/dates';
import { AttendanceStatus, TimeOffStatus } from '@prisma/client';

export interface WorkedDaysResult {
  workedDays: number;
  paidLeaveDays: number;
  unpaidDays: number;
  totalPayableDays: number;
  standardWorkingDays: number;
}

/** The shape the rules below need, so one employee's rows and a whole payrun's fit alike. */
export interface AttendanceLike {
  status: AttendanceStatus;
}
export interface TimeOffLike {
  duration: number;
  timeOffType: { name: string };
}

/**
 * The worked-days rules themselves, with no database access.
 *
 * A payrun computes these for everyone at once from rows fetched in a single
 * query, while a single employee still goes through the async wrapper below.
 * Both share this function so the two paths cannot drift apart.
 */
export function workedDaysFrom(
  attendances: AttendanceLike[],
  timeOffRequests: TimeOffLike[],
  standardWorkingDays: number
): WorkedDaysResult {
  let workedDays = 0;
  for (const att of attendances) {
    if (att.status === AttendanceStatus.PRESENT || att.status === AttendanceStatus.LATE) {
      workedDays += 1;
    } else if (att.status === AttendanceStatus.HALF_DAY) {
      workedDays += 0.5;
    }
  }

  let paidLeaveDays = 0;
  let unpaidDays = 0;

  for (const req of timeOffRequests) {
    // If leave type is unpaid or has payroll deduction
    if (req.timeOffType.name.toLowerCase().includes('unpaid')) {
      unpaidDays += req.duration;
    } else {
      paidLeaveDays += req.duration;
    }
  }

  // If no attendance records were explicitly logged, default to standard working days minus unpaid leaves
  if (attendances.length === 0) {
    workedDays = Math.max(0, standardWorkingDays - unpaidDays);
  }

  const totalPayableDays = Math.min(standardWorkingDays, workedDays + paidLeaveDays);

  return { workedDays, paidLeaveDays, unpaidDays, totalPayableDays, standardWorkingDays };
}

/**
 * Calculates worked days and leave days for an employee during a payrun period.
 */
export async function calculateEmployeeWorkedDays(
  employeeId: string,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<WorkedDaysResult> {
  const standardWorkingDays = getWorkingDaysInRange(periodStartDate, periodEndDate);

  const [attendances, timeOffRequests] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: periodStartDate, lte: periodEndDate } },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        employeeId,
        status: TimeOffStatus.APPROVED,
        startDate: { lte: periodEndDate },
        endDate: { gte: periodStartDate },
      },
      include: { timeOffType: true },
    }),
  ]);

  return workedDaysFrom(attendances, timeOffRequests, standardWorkingDays);
}
