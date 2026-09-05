import { Router } from 'express';
import { Role } from '@prisma/client';

import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departments.controller';

const router = Router();

router.use(authenticate);

// Reading is open to any signed-in user: department names label employees,
// contracts and the dashboard, so every screen needs them.
router.get('/', listDepartments);
router.get('/:id', getDepartment);

// Departments are HR master data, so the roles with CRUD over employees and
// contracts manage them too. An employee has no HR administration access.
const HR_WRITE = [
  Role.HR_MANAGER,
  Role.HR_PAYROLL_USER,
  Role.HR_PAYROLL_MANAGER,
  Role.ADMIN,
] as const;

router.post('/', authorize(...HR_WRITE), createDepartment);
router.put('/:id', authorize(...HR_WRITE), updateDepartment);
router.delete('/:id', authorize(Role.ADMIN), deleteDepartment);

export default router;
