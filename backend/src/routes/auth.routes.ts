import { Router } from 'express';
import { login, getMe, logout, changePassword, forgotPassword } from '../controllers/auth.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login — Authenticate user and return JWT
router.post('/login', login);

// GET /api/auth/me — Get current user profile (optional auth for silent session probe)
router.get('/me', optionalAuthenticate, getMe);

// POST /api/auth/logout — Clear auth cookie
router.post('/logout', logout);

// POST /api/auth/change-password — Set new password & clear mustChangePassword
router.post('/change-password', authenticate, changePassword);

// POST /api/auth/forgot-password — Request temporary password by email
router.post('/forgot-password', forgotPassword);

export default router;
