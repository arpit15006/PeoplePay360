import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export async function getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      period: req.query.period as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      employeeType: req.query.employeeType as string | undefined,
    };

    const metrics = await DashboardService.getMetrics(filters);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}
