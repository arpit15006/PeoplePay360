import { Router, Request, Response, NextFunction } from 'express';
import { SalaryStructureService } from '../services/salaryStructure.service';
import { createSalaryStructureSchema, updateSalaryStructureSchema } from '../validators/payroll.validator';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/salary-structures — List all salary structures
router.get(
  '/',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const structures = await SalaryStructureService.listStructures();
      res.json({ success: true, count: structures.length, data: structures });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/salary-structures/:id — Get structure details with its rules
router.get(
  '/:id',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structure = await SalaryStructureService.getStructureById(req.params.id);
      res.json({ success: true, data: structure });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/salary-structures — Create salary structure (Payroll Manager+)
router.post(
  '/',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSalaryStructureSchema.parse(req.body);
      const structure = await SalaryStructureService.createStructure(validated);
      res.status(201).json({ success: true, data: structure });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/salary-structures/:id — Update salary structure
router.put(
  '/:id',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateSalaryStructureSchema.parse(req.body);
      const structure = await SalaryStructureService.updateStructure(req.params.id, validated);
      res.json({ success: true, data: structure });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/salary-structures/:id — Delete structure
router.delete(
  '/:id',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await SalaryStructureService.deleteStructure(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
