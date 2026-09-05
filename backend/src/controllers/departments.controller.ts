import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from '../validators/department.validator';

export async function listDepartments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departments = await DepartmentService.listDepartments();
    res.json({ success: true, count: departments.length, data: departments });
  } catch (err) {
    next(err);
  }
}

export async function getDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await DepartmentService.getDepartmentById(req.params.id) });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createDepartmentSchema.parse(req.body);
    const department = await DepartmentService.createDepartment(validated);
    res.status(201).json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateDepartmentSchema.parse(req.body);
    const department = await DepartmentService.updateDepartment(req.params.id, validated);
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
}

export async function deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await DepartmentService.deleteDepartment(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
}
