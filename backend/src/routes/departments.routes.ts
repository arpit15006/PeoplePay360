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

// Section 3 lists each role's modules explicitly, and the HR Manager's list —
// Employees, Attendance, Contracts, Working Schedules and Time Off — does not
// include Departments. Only the Admin is given "full access to all modules and
// models", so changing the organisation's structure is theirs alone.
router.post('/', authorize(Role.ADMIN), createDepartment);
router.put('/:id', authorize(Role.ADMIN), updateDepartment);
router.delete('/:id', authorize(Role.ADMIN), deleteDepartment);

export default router;
