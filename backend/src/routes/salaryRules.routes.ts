import { Router, Request, Response, NextFunction } from 'express';
import { SalaryStructureService } from '../services/salaryStructure.service';
import { createSalaryRuleSchema, updateSalaryRuleSchema } from '../validators/payroll.validator';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// GET /api/salary-rules — List salary rules (optional structureId query filter)
router.get(
  '/',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.HR_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structureId = req.query.structureId as string | undefined;
      const rules = await SalaryStructureService.listRules(structureId);
      res.json({ success: true, count: rules.length, data: rules });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/salary-rules/:id — Get rule by ID
router.get(
  '/:id',
  authorize(Role.HR_PAYROLL_USER, Role.HR_PAYROLL_MANAGER, Role.HR_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await SalaryStructureService.getRuleById(req.params.id);
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/salary-rules — Create salary rule
router.post(
  '/',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSalaryRuleSchema.parse(req.body);
      const rule = await SalaryStructureService.createRule(validated);
      res.status(201).json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/salary-rules/:id — Update salary rule
router.put(
  '/:id',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateSalaryRuleSchema.parse(req.body);
      const rule = await SalaryStructureService.updateRule(req.params.id, validated);
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/salary-rules/:id — Delete salary rule
router.delete(
  '/:id',
  authorize(Role.HR_PAYROLL_MANAGER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await SalaryStructureService.deleteRule(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
