import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/departments — List all departments
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    });
    res.json({ success: true, count: departments.length, data: departments });
  } catch (err) {
    next(err);
  }
});

export default router;
