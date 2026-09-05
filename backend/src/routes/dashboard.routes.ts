import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/dashboard — Metrics aggregated with interactive filters (HR, Payroll, Admin)
router.get(
  '/',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.HR_MANAGER, Role.ADMIN),
  getDashboardMetrics
);

export default router;
