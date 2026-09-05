import { Router } from 'express';
import {
  listPayruns,
  getPayrun,
  createPayrun,
  computePayrun,
  validatePayrun,
  markPayrunPaid,
  sendBulkPayslips,
} from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List & view payruns (Payroll users, HR, Admin)
router.get(
  '/',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  listPayruns
);

router.get(
  '/:id',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  getPayrun
);

// Create payrun (Wizard Step 1 & 2)
router.post(
  '/',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  createPayrun
);

// Compute payrun (Triggers calculation engine)
router.post(
  '/:id/compute',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  computePayrun
);

// Validate payrun (Manager approval)
router.post(
  '/:id/validate',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  validatePayrun
);

// Mark as Paid
router.post(
  '/:id/mark-paid',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  markPayrunPaid
);

// Send payslips via email
router.post(
  '/:id/send-payslips',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  sendBulkPayslips
);

export default router;
