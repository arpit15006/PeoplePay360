import { z } from 'zod';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const dailyShiftSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  dayName: z.string().min(1),
  startTime: z.string().regex(TIME, 'startTime must be HH:MM'),
  endTime: z.string().regex(TIME, 'endTime must be HH:MM'),
  // The unpaid meal break. Worked hours subtract it, so it cannot exceed a day.
  breakMinutes: z.number().int().min(0).max(1440),
  isWorkingDay: z.boolean(),
});

export const createScheduleSchema = z.object({
  name: z.string().min(1, 'name is required'),
  type: z.enum(['STANDARD', 'FLEXIBLE', 'SHIFT']).optional(),
  status: z.string().optional(),
  dailyShifts: z.array(dailyShiftSchema).optional(),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
