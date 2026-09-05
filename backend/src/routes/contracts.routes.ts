import { Router } from 'express';
import {
  listContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
} from '../controllers/contracts.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/contracts — List contracts (Employee sees own; HR/Admin sees all)
router.get('/', listContracts);

// GET /api/contracts/:id — Get contract details
router.get('/:id', getContract);

// POST /api/contracts — Create a new contract (HR Manager, HR Payroll Manager, Admin)
router.post(
  '/',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  createContract
);

// PUT /api/contracts/:id — Update contract (HR Manager, HR Payroll Manager, Admin)
router.put(
  '/:id',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  updateContract
);

// DELETE /api/contracts/:id — Delete contract (Admin only)
router.delete('/:id', authorize(Role.ADMIN), deleteContract);

export default router;
