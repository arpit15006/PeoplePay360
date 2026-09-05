import { Router } from 'express';
import { listPayslips, getPayslip } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/payslips — List payslips (Employee sees own, Payroll/HR sees all)
router.get('/', listPayslips);

// GET /api/payslips/:id — Get payslip details + line items (Employee sees own, Payroll/HR sees all)
router.get('/:id', getPayslip);

export default router;
