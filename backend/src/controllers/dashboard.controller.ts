import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthUser } from '../middleware/auth';
import { TtlCache } from '../utils/ttlCache';

/**
 * The dashboard is seven aggregate queries over the whole company, and it is
 * the first thing every HR user opens in the morning — so the same figures get
 * rebuilt dozens of times within a minute. Half a minute of staleness on a
 * monthly payroll summary costs nothing and takes the cost from one build per
 * viewer to one per window.
 *
 * The key carries the filters and the role, because both change the answer.
 */
const CACHE_TTL_MS = 30_000;
const dashboardCache = new TtlCache<unknown>(CACHE_TTL_MS);

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
    const key = [filters.period, filters.departmentId, filters.employeeType, user?.role]
      .map((part) => part ?? '-')
      .join('|');

    const metrics = await dashboardCache.get(key, () =>
      DashboardService.getMetrics(filters, user?.role)
    );
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}
