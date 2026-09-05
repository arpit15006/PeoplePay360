import { Router } from 'express';
import {
  listTypes,
  createType,
  updateType,
  deleteType,
  listAllocations,
  createAllocation,
  updateAllocation,
  listRequests,
  createRequest,
  approveRequest,
  refuseRequest,
} from '../controllers/timeoff.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// ─── 1. Time Off Types ──────────────────────────────────────────
router.get('/types', listTypes);
router.post('/types', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), createType);
router.put('/types/:id', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), updateType);
router.delete('/types/:id', authorize(Role.ADMIN), deleteType);

// ─── 2. Allocations ─────────────────────────────────────────────
router.get('/allocations', listAllocations);
router.post('/allocations', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), createAllocation);
router.put('/allocations/:id', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), updateAllocation);

// ─── 3. Requests & Approvals ────────────────────────────────────
router.get('/requests', listRequests);
router.post('/requests', createRequest);
router.put('/requests/:id/approve', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), approveRequest);
router.put('/requests/:id/refuse', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), refuseRequest);

export default router;
