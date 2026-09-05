export type ScheduleType = 'STANDARD' | 'FLEXIBLE' | 'SHIFT';

export interface DailyShift {
  id?: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isWorkingDay: boolean;
}

export interface WorkingSchedule {
  id: string;
  name: string;
  type: ScheduleType;
  weeklyHours: number;
  status: string;
  dailyShifts: DailyShift[];
  _count?: { employees: number };
}

export type ScheduleInput = {
  name: string;
  type: ScheduleType;
  status: string;
  dailyShifts: DailyShift[];
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  STANDARD: 'Standard',
  FLEXIBLE: 'Flexible',
  SHIFT: 'Shift',
};

/** Monday-first ordering for the form, matching how the PRD lists the week. */
export const WEEK_DAYS: { dayOfWeek: number; dayName: string }[] = [
  { dayOfWeek: 1, dayName: 'Monday' },
  { dayOfWeek: 2, dayName: 'Tuesday' },
  { dayOfWeek: 3, dayName: 'Wednesday' },
  { dayOfWeek: 4, dayName: 'Thursday' },
  { dayOfWeek: 5, dayName: 'Friday' },
  { dayOfWeek: 6, dayName: 'Saturday' },
  { dayOfWeek: 0, dayName: 'Sunday' },
];

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Hours worked on one day: (end - start) - break.
 *
 * This mirrors calculateWeeklyHours in backend/src/services/schedule.service.ts.
 * It exists only so the form can preview the total while editing — the value
 * persisted is always the one the server computes, never a client number, and
 * never something the user typed. PRD Screen 5 requires this.
 */
export const dayHours = (shift: DailyShift): number => {
  if (!shift.isWorkingDay) return 0;
  const worked = toMinutes(shift.endTime) - toMinutes(shift.startTime) - (shift.breakMinutes || 0);
  return Math.max(0, worked) / 60;
};

export const weeklyHoursOf = (shifts: DailyShift[]): number =>
  Math.round(shifts.reduce((total, shift) => total + dayHours(shift), 0) * 100) / 100;

export const defaultShifts = (): DailyShift[] =>
  WEEK_DAYS.map(({ dayOfWeek, dayName }) => {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return {
      dayOfWeek,
      dayName,
      startTime: isWeekend ? '00:00' : '09:00',
      endTime: isWeekend ? '00:00' : '18:00',
      breakMinutes: isWeekend ? 0 : 60,
      isWorkingDay: !isWeekend,
    };
  });
