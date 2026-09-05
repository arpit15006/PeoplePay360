import { Router } from 'express';
import {
  listEmployees,
  getEmployee,
  getRelatedCounts,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employees.controller';
import { importEmployees } from '../controllers/bulkImport.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// GET /api/employees — List employees (Employee sees own; HR/Admin sees all)
router.get('/', listEmployees);

// GET /api/employees/:id — Get employee details
router.get('/:id', getEmployee);

// GET /api/employees/:id/related — Get related record counts for smart buttons
router.get('/:id/related', getRelatedCounts);

// POST /api/employees — Create a new employee (HR Manager, HR Payroll Manager, Admin)
router.post(
  '/',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  createEmployee
);

// POST /api/employees/bulk-import — Create many employees from a CSV
// Declared before /:id so "bulk-import" is not read as an employee id.
router.post('/bulk-import', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), importEmployees);

// PUT /api/employees/:id — Update employee (HR Manager, HR Payroll Manager, Admin)
router.put(
  '/:id',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  updateEmployee
);

// DELETE /api/employees/:id — Delete employee (Admin only)
router.delete('/:id', authorize(Role.ADMIN), deleteEmployee);

export default router;
