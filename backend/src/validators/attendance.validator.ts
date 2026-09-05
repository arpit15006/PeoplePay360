import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const createAttendanceSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID').optional(), // If omitted, defaults to logged-in user's employeeId
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  checkIn: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)'),
  checkOut: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  notes: z.string().optional().nullable(),
});

export const updateAttendanceSchema = z.object({
  checkIn: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional(),
  checkOut: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  notes: z.string().optional().nullable(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
