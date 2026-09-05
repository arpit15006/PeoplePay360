import { Router } from 'express';
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/schedules.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/schedules — List all working schedules
router.get('/', listSchedules);

// GET /api/schedules/:id — Get schedule details + shifts
router.get('/:id', getSchedule);

// POST /api/schedules — Create schedule (HR Manager, HR Payroll Manager, Admin)
router.post(
  '/',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  createSchedule
);

// PUT /api/schedules/:id — Update schedule (HR Manager, HR Payroll Manager, Admin)
router.put(
  '/:id',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  updateSchedule
);

// DELETE /api/schedules/:id — Delete schedule (Admin only)
router.delete('/:id', authorize(Role.ADMIN), deleteSchedule);

export default router;
