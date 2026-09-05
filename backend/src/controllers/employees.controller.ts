import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employee.validator';

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      q: req.query.q as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as string | undefined,
      employeeType: req.query.employeeType as string | undefined,
    };

    const employees = await EmployeeService.listEmployees(filters, req.user!);
    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    next(err);
  }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await EmployeeService.getEmployeeById(req.params.id, req.user!);
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
}

export async function getRelatedCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const counts = await EmployeeService.getEmployeeRelatedCounts(req.params.id, req.user!);
    res.json({ success: true, data: counts });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createEmployeeSchema.parse(req.body);
    const employee = await EmployeeService.createEmployee(validated);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateEmployeeSchema.parse(req.body);
    const employee = await EmployeeService.updateEmployee(req.params.id, validated);
    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await EmployeeService.deleteEmployee(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
