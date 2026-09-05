import { Request, Response, NextFunction } from 'express';
import { TimeOffService } from '../services/timeoff.service';
import {
  createTimeOffTypeSchema,
  updateTimeOffTypeSchema,
  createAllocationSchema,
  updateAllocationSchema,
  createTimeOffRequestSchema,
} from '../validators/timeoff.validator';

// Types
export async function listTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const types = await TimeOffService.listTypes();
    res.json({ success: true, count: types.length, data: types });
  } catch (err) {
    next(err);
  }
}

export async function createType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createTimeOffTypeSchema.parse(req.body);
    const type = await TimeOffService.createType(validated);
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
}

export async function updateType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateTimeOffTypeSchema.parse(req.body);
    const type = await TimeOffService.updateType(req.params.id, validated);
    res.json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
}

export async function deleteType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await TimeOffService.deleteType(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Allocations
export async function listAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      employeeId: req.query.employeeId as string | undefined,
      validityYear: req.query.validityYear ? Number(req.query.validityYear) : undefined,
    };
    const allocations = await TimeOffService.listAllocations(filters, req.user!);
    res.json({ success: true, count: allocations.length, data: allocations });
  } catch (err) {
    next(err);
  }
}

export async function createAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createAllocationSchema.parse(req.body);
    const allocation = await TimeOffService.createAllocation(validated, req.user!);
    res.status(201).json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
}

export async function updateAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateAllocationSchema.parse(req.body);
    const allocation = await TimeOffService.updateAllocation(req.params.id, validated, req.user!);
    res.json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
}

// Requests & Approvals
export async function listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      employeeId: req.query.employeeId as string | undefined,
      status: req.query.status as string | undefined,
    };
    const requests = await TimeOffService.listRequests(filters, req.user!);
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createTimeOffRequestSchema.parse(req.body);
    const request = await TimeOffService.createRequest(validated, req.user!);
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

export async function approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = await TimeOffService.approveRequest(req.params.id, req.user!);
    res.json({ success: true, message: 'Time off request approved', data: request });
  } catch (err) {
    next(err);
  }
}

export async function refuseRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = await TimeOffService.refuseRequest(req.params.id, req.user!);
    res.json({ success: true, message: 'Time off request refused', data: request });
  } catch (err) {
    next(err);
  }
}
