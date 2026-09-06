import { Request, Response, NextFunction } from 'express';
import { PayrollService } from '../services/payroll.service';
import { createPayrunSchema } from '../validators/payroll.validator';

// Payruns
export async function listPayruns(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payruns = await PayrollService.listPayruns();
    res.json({ success: true, count: payruns.length, data: payruns });
  } catch (err) {
    next(err);
  }
}

export async function getPayrun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payrun = await PayrollService.getPayrunById(req.params.id);
    res.json({ success: true, data: payrun });
  } catch (err) {
    next(err);
  }
}

export async function createPayrun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createPayrunSchema.parse(req.body);
    const payrun = await PayrollService.createPayrun(validated);
    res.status(201).json({ success: true, data: payrun });
  } catch (err) {
    next(err);
  }
}

export async function getPayrunWarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { collectPayrunWarnings } = await import('../payroll/payrunWarnings');
    const warnings = await collectPayrunWarnings(req.params.id);
    res.json({ success: true, count: warnings.length, data: warnings });
  } catch (err) {
    next(err);
  }
}

export async function computePayrun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await PayrollService.computePayrun(req.params.id);
    res.json({ success: true, message: 'Payrun computed successfully', ...result });
  } catch (err) {
    next(err);
  }
}

export async function validatePayrun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payrun = await PayrollService.validatePayrun(req.params.id);
    res.json({ success: true, message: 'Payrun validated successfully', data: payrun });
  } catch (err) {
    next(err);
  }
}

export async function markPayrunPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payrun = await PayrollService.markPayrunPaid(req.params.id);
    res.json({ success: true, message: 'Payrun marked as paid', data: payrun });
  } catch (err) {
    next(err);
  }
}

export async function sendBulkPayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { EmailService } = await import('../services/email.service');
    // Absent or empty, the send covers the whole payrun; the dialog sends the
    // ticked ids when the operator has narrowed it.
    const { payslipIds } = (req.body ?? {}) as { payslipIds?: unknown };
    const chosen =
      Array.isArray(payslipIds) && payslipIds.every((id) => typeof id === 'string')
        ? (payslipIds as string[])
        : undefined;
    const result = await EmailService.sendBulkPayrunEmails(req.params.id, chosen);
    res.json({ success: true, message: 'Payslips sent to employees', ...result });
  } catch (err) {
    next(err);
  }
}

// Payslips
export async function listPayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = {
      payrunId: req.query.payrunId as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
    };
    const payslips = await PayrollService.listPayslips(filters, req.user!);
    res.json({ success: true, count: payslips.length, data: payslips });
  } catch (err) {
    next(err);
  }
}

export async function getPayslip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payslip = await PayrollService.getPayslipById(req.params.id, req.user!);
    res.json({ success: true, data: payslip });
  } catch (err) {
    next(err);
  }
}
