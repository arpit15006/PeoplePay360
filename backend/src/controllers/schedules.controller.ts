import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { createScheduleSchema, updateScheduleSchema } from '../validators/schedule.validator';

export async function listSchedules(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedules = await ScheduleService.listSchedules();
    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await ScheduleService.getScheduleById(req.params.id);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createScheduleSchema.parse(req.body);
    const schedule = await ScheduleService.createSchedule(validated);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateScheduleSchema.parse(req.body);
    const schedule = await ScheduleService.updateSchedule(req.params.id, validated);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await ScheduleService.deleteSchedule(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
