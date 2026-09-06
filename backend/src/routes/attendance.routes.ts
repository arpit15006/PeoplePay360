import { Router } from 'express';
import {
  listAttendance,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from '../controllers/attendance.controller';
import { importAttendance } from '../controllers/bulkImport.controller';
import {
  getMySession,
  checkIn,
  pause,
  resume,
  stop,
  heartbeat,
  previewStop,
  explain,
  whoIsWorking,
} from '../controllers/attendanceSession.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// ─── The caller's own working session ────────────────────────────────────────
//
// Declared before /:id so "session" and "who-is-working" are not read as record
// ids. Each acts on the signed-in employee alone, so no role check is needed
// beyond being linked to an employee record.
router.get('/session', getMySession);
router.get('/session/preview-stop', previewStop);
router.post('/session/check-in', checkIn);
router.post('/session/pause', pause);
router.post('/session/resume', resume);
router.post('/session/stop', stop);
router.post('/session/heartbeat', heartbeat);
router.post('/session/explain', explain);

// GET /api/attendance/who-is-working — everyone with the clock running
router.get(
  '/who-is-working',
  authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  whoIsWorking
);

// GET /api/attendance — List attendance (Employee sees own; HR/Admin sees all)
router.get('/', listAttendance);

// GET /api/attendance/:id — Get attendance record
router.get('/:id', getAttendance);

// POST /api/attendance — Check-in or log attendance
router.post('/', createAttendance);

// POST /api/attendance/bulk-import — Import a period of attendance from a CSV
router.post('/bulk-import', authorize(Role.HR_MANAGER, Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN), importAttendance);

// PUT /api/attendance/:id — Update check-out or correct attendance (HR+)
router.put('/:id', updateAttendance);

// DELETE /api/attendance/:id — Delete attendance record (Admin only)
router.delete('/:id', authorize(Role.ADMIN), deleteAttendance);

export default router;
