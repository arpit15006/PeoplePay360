import prisma from '../config/db';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ScheduleType } from '@prisma/client';
import { parseTimeToMinutes } from '../utils/dates';

export interface DailyShiftInput {
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dayName: string;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  breakMinutes: number; // 60
  isWorkingDay: boolean;
}

export interface CreateScheduleInput {
  name: string;
  type?: ScheduleType;
  status?: string;
  dailyShifts?: DailyShiftInput[];
}

export interface UpdateScheduleInput {
  name?: string;
  type?: ScheduleType;
  status?: string;
  dailyShifts?: DailyShiftInput[];
}

/**
 * Auto-calculate weekly working hours from daily shifts.
 * PRD requirement: weeklyHours is NEVER entered manually.
 */
export function calculateWeeklyHours(shifts: DailyShiftInput[]): number {
  let totalMinutes = 0;
  for (const shift of shifts) {
    if (shift.isWorkingDay) {
      const startMin = parseTimeToMinutes(shift.startTime);
      const endMin = parseTimeToMinutes(shift.endTime);
      const breakMin = shift.breakMinutes || 0;
      const worked = Math.max(0, endMin - startMin - breakMin);
      totalMinutes += worked;
    }
  }
  return Math.round((totalMinutes / 60) * 100) / 100;
}

const DEFAULT_DAYS = [
  { dayOfWeek: 0, dayName: 'Sunday', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isWorkingDay: false },
  { dayOfWeek: 1, dayName: 'Monday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 2, dayName: 'Tuesday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 3, dayName: 'Wednesday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 4, dayName: 'Thursday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 5, dayName: 'Friday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
  { dayOfWeek: 6, dayName: 'Saturday', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isWorkingDay: false },
];

export class ScheduleService {
  /**
   * List all working schedules
   */
  static async listSchedules() {
    const schedules = await prisma.workingSchedule.findMany({
      orderBy: { name: 'asc' },
      include: {
        dailyShifts: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { employees: true } },
      },
    });
    return schedules;
  }

  /**
   * Get single working schedule by ID
   */
  static async getScheduleById(id: string) {
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id },
      include: {
        dailyShifts: { orderBy: { dayOfWeek: 'asc' } },
        employees: {
          select: { id: true, name: true, employeeCode: true, jobPosition: true },
        },
      },
    });

    if (!schedule) throw new NotFoundError('Working schedule');
    return schedule;
  }

  /**
   * Create a new working schedule
   */
  static async createSchedule(input: CreateScheduleInput) {
    const existing = await prisma.workingSchedule.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('A schedule with this name already exists');

    const shifts = input.dailyShifts && input.dailyShifts.length > 0 ? input.dailyShifts : DEFAULT_DAYS;
    const weeklyHours = calculateWeeklyHours(shifts);

    const schedule = await prisma.workingSchedule.create({
      data: {
        name: input.name,
        type: input.type || ScheduleType.STANDARD,
        status: input.status || 'Active',
        weeklyHours,
        dailyShifts: {
          create: shifts.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            dayName: s.dayName,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes,
            isWorkingDay: s.isWorkingDay,
          })),
        },
      },
      include: {
        dailyShifts: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    return schedule;
  }

  /**
   * Update schedule and optionally its daily shifts
   */
  static async updateSchedule(id: string, input: UpdateScheduleInput) {
    const existing = await prisma.workingSchedule.findUnique({
      where: { id },
      include: { dailyShifts: true },
    });
    if (!existing) throw new NotFoundError('Working schedule');

    let weeklyHours = existing.weeklyHours;

    if (input.dailyShifts && input.dailyShifts.length > 0) {
      weeklyHours = calculateWeeklyHours(input.dailyShifts);

      // Re-create daily shifts in transaction
      await prisma.$transaction([
        prisma.dailySchedule.deleteMany({ where: { scheduleId: id } }),
        prisma.dailySchedule.createMany({
          data: input.dailyShifts.map((s) => ({
            scheduleId: id,
            dayOfWeek: s.dayOfWeek,
            dayName: s.dayName,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes,
            isWorkingDay: s.isWorkingDay,
          })),
        }),
      ]);
    }

    const updated = await prisma.workingSchedule.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        status: input.status,
        weeklyHours,
      },
      include: {
        dailyShifts: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    return updated;
  }

  /**
   * Delete schedule (Admin only)
   */
  static async deleteSchedule(id: string) {
    const existing = await prisma.workingSchedule.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) throw new NotFoundError('Working schedule');

    if (existing._count.employees > 0) {
      throw new ConflictError(
        `Cannot delete schedule: ${existing._count.employees} employees are currently assigned to it.`
      );
    }

    await prisma.workingSchedule.delete({ where: { id } });
    return { success: true, message: 'Working schedule deleted successfully' };
  }
}
