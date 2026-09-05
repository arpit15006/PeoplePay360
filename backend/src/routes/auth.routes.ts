import { Router } from 'express';
import { login, getMe, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login — Authenticate user and return JWT
router.post('/login', login);

// GET /api/auth/me — Get current user profile (requires auth)
router.get('/me', authenticate, getMe);

// POST /api/auth/logout — Clear auth cookie
router.post('/logout', logout);

export default router;
