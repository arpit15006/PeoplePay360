import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthUser } from '../middleware/auth';

export async function getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      period: req.query.period as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      employeeType: req.query.employeeType as string | undefined,
    };

    // The role decides which action prompts are worth raising, so it travels
    // with the filters rather than being applied after the fact in the browser.
    const user = (req as Request & { user?: AuthUser }).user;
    const metrics = await DashboardService.getMetrics(filters, user?.role);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}
