import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { createAttendanceSchema, updateAttendanceSchema } from '../validators/attendance.validator';

export async function listAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      employeeId: req.query.employeeId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      status: req.query.status as string | undefined,
      month: req.query.month as string | undefined,
      year: req.query.year as string | undefined,
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
    };

    // The service returns the page plus its meta, so the pager on the screen
    // knows how many there are without the rows being sent.
    const page = await AttendanceService.listAttendance(filters, req.user!);
    res.json({ success: true, ...page });
  } catch (err) {
    next(err);
  }
}

export async function getAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await AttendanceService.getAttendanceById(req.params.id, req.user!);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function createAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createAttendanceSchema.parse(req.body);
    const record = await AttendanceService.createAttendance(validated, req.user!);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function updateAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateAttendanceSchema.parse(req.body);
    const record = await AttendanceService.updateAttendance(req.params.id, validated, req.user!);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AttendanceService.deleteAttendance(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
