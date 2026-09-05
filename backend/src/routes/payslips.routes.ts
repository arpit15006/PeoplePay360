import { Router } from 'express';
import { Role } from '@prisma/client';
import { listPayslips, getPayslip } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

/**
 * PRD §28 — Payslips: Employee "Own", HR Manager "—", Payroll User "CRU",
 * Payroll Manager "CRUD", Admin "Full". HR_MANAGER is deliberately excluded;
 * the service additionally scopes EMPLOYEE to their own payslips.
 */
const PAYSLIP_READERS = [
  Role.EMPLOYEE,
  Role.HR_PAYROLL_USER,
  Role.HR_PAYROLL_MANAGER,
  Role.ADMIN,
] as const;

// GET /api/payslips — List payslips (Employee sees own, Payroll/Admin sees all)
router.get('/', authorize(...PAYSLIP_READERS), listPayslips);

// GET /api/payslips/:id — Payslip details + line items
router.get('/:id', authorize(...PAYSLIP_READERS), getPayslip);

export default router;
