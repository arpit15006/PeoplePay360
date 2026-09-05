import { Router } from 'express';
import {
  listAttendance,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/attendance — List attendance (Employee sees own; HR/Admin sees all)
router.get('/', listAttendance);

// GET /api/attendance/:id — Get attendance record
router.get('/:id', getAttendance);

// POST /api/attendance — Check-in or log attendance
router.post('/', createAttendance);

// PUT /api/attendance/:id — Update check-out or correct attendance (HR+)
router.put('/:id', updateAttendance);

// DELETE /api/attendance/:id — Delete attendance record (Admin only)
router.delete('/:id', authorize(Role.ADMIN), deleteAttendance);

export default router;
