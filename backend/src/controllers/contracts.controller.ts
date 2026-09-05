import { Request, Response, NextFunction } from 'express';
import { ContractService } from '../services/contract.service';
import { createContractSchema, updateContractSchema } from '../validators/contract.validator';

export async function listContracts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      employeeId: req.query.employeeId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as string | undefined,
      q: req.query.q as string | undefined,
    };

    const contracts = await ContractService.listContracts(filters, req.user!);
    res.json({ success: true, count: contracts.length, data: contracts });
  } catch (err) {
    next(err);
  }
}

export async function getContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contract = await ContractService.getContractById(req.params.id, req.user!);
    res.json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
}

export async function createContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createContractSchema.parse(req.body);
    const contract = await ContractService.createContract(validated);
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
}

export async function updateContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = updateContractSchema.parse(req.body);
    const contract = await ContractService.updateContract(req.params.id, validated);
    res.json({ success: true, data: contract });
  } catch (err) {
    next(err);
  }
}

export async function deleteContract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await ContractService.deleteContract(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
