import prisma from '../config/db';
import { ContractStatus } from '@prisma/client';
import { ContractService } from './contract.service';
import { BulkImportResult, lookupKey, rowError } from './bulkImport.types';

export interface ContractImportRow {
  rowNumber: number;
  employee?: string;
  startdate?: string;
  enddate?: string;
  wage?: string;
  department?: string;
  position?: string;
  salarystructure?: string;
  status?: string;
}

export interface ImportedContract {
  employee: string;
  employeeCode: string;
  position: string;
  wage: number;
  startDate: string;
  endDate: string | null;
  status: string;
}

const STATUSES = Object.values(ContractStatus) as string[];

/** Same spreadsheet date formats the attendance importer accepts. */
function parseImportDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return buildUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (slash) return buildUtcDate(Number(slash[3]), Number(slash[2]), Number(slash[1]));

  return null;
}

function buildUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

/** Two ranges overlap when each starts before the other ends; null end = open. */
function overlaps(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEnds = aEnd?.getTime() ?? Infinity;
  const bEnds = bEnd?.getTime() ?? Infinity;
  return aStart.getTime() <= bEnds && bStart.getTime() <= aEnds;
}

/**
 * Bulk-creates contracts — the annual wage-revision job, where every employee
 * gets a new contract starting the same day at a different rate.
 *
 * Names are resolved to ids here, then each row is handed to
 * `ContractService.createContract` so the overlap check, the end-before-start
 * check and the "structure must be active" rule all apply exactly as they do
 * for a single contract. The only rule added on top is in-file overlap: the
 * service compares against the database, which cannot yet see the row this same
 * file added a moment ago.
 */
export async function bulkImportContracts(
  rows: ContractImportRow[]
): Promise<BulkImportResult<ImportedContract>> {
  const errors: string[] = [];
  const imported: ImportedContract[] = [];

  const [employees, departments, structures] = await Promise.all([
    prisma.employee.findMany({
      select: { id: true, name: true, email: true, employeeCode: true, departmentId: true },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.salaryStructure.findMany({ select: { id: true, name: true } }),
  ]);

  const byEmail = new Map(employees.map((e) => [lookupKey(e.email), e]));
  const byCode = new Map(employees.map((e) => [lookupKey(e.employeeCode), e]));
  const deptByName = new Map(departments.map((d) => [lookupKey(d.name), d]));
  const structureByName = new Map(structures.map((s) => [lookupKey(s.name), s]));

  // Active periods claimed by earlier rows of this same file, per employee.
  const claimedInFile = new Map<string, { start: Date; end: Date | null; row: number }[]>();

  for (const row of rows) {
    const n = row.rowNumber;

    const employeeRef = String(row.employee ?? '').trim();
    const employee = byEmail.get(lookupKey(employeeRef)) ?? byCode.get(lookupKey(employeeRef));
    if (!employee) {
      errors.push(rowError(n, `Employee "${employeeRef || '(blank)'}" not found. Give an existing email or employee code.`));
      continue;
    }

    const startDate = parseImportDate(String(row.startdate ?? ''));
    if (!startDate) {
      errors.push(rowError(n, `Start date "${row.startdate ?? '(blank)'}" must be yyyy-mm-dd or dd/mm/yyyy.`));
      continue;
    }

    // A blank end date is an open-ended contract, which is normal.
    const endRaw = String(row.enddate ?? '').trim();
    let endDate: Date | null = null;
    if (endRaw) {
      endDate = parseImportDate(endRaw);
      if (!endDate) {
        errors.push(rowError(n, `End date "${endRaw}" must be yyyy-mm-dd or dd/mm/yyyy.`));
        continue;
      }
      if (endDate < startDate) {
        errors.push(rowError(n, `End date ${endRaw} is before the start date ${row.startdate}.`));
        continue;
      }
    }

    // Strip the thousands separators and currency symbols a spreadsheet adds.
    const wageRaw = String(row.wage ?? '').trim().replace(/[,\s₹$]/g, '');
    const wage = Number(wageRaw);
    if (!wageRaw || !Number.isFinite(wage) || wage <= 0) {
      errors.push(rowError(n, `Wage "${row.wage ?? '(blank)'}" must be a number above zero.`));
      continue;
    }

    // The contract's department defaults to the employee's own, so the column
    // may be left blank for the common case.
    const deptRef = String(row.department ?? '').trim();
    let departmentId: string | null;
    if (deptRef) {
      const department = deptByName.get(lookupKey(deptRef));
      if (!department) {
        errors.push(rowError(n, `Department "${deptRef}" not found.`));
        continue;
      }
      departmentId = department.id;
    } else {
      departmentId = employee.departmentId;
      if (!departmentId) {
        errors.push(rowError(n, `${employee.name} has no department, so the contract needs one.`));
        continue;
      }
    }

    const position = String(row.position ?? '').trim();
    if (position.length < 2) {
      errors.push(rowError(n, 'Position is required.'));
      continue;
    }

    const structureRef = String(row.salarystructure ?? '').trim();
    const structure = structureByName.get(lookupKey(structureRef));
    if (!structure) {
      errors.push(rowError(n, `Salary structure "${structureRef || '(blank)'}" not found. It must match a structure name exactly.`));
      continue;
    }

    const statusRaw = String(row.status ?? '').trim();
    const status = statusRaw ? statusRaw.toUpperCase().replace(/[\s-]+/g, '_') : ContractStatus.DRAFT;
    if (!STATUSES.includes(status)) {
      errors.push(rowError(n, `Status "${statusRaw}" must be one of ${STATUSES.join(', ')}.`));
      continue;
    }

    // Only ACTIVE contracts compete for a period — the service applies the same
    // rule against the database, and this covers the rest of this file.
    if (status === ContractStatus.ACTIVE) {
      const claimed = claimedInFile.get(employee.id) ?? [];
      const clash = claimed.find((c) => overlaps(startDate, endDate, c.start, c.end));
      if (clash) {
        errors.push(
          rowError(n, `${employee.name} already has an active contract covering this period on row ${clash.row} of this file.`)
        );
        continue;
      }
      claimed.push({ start: startDate, end: endDate, row: n });
      claimedInFile.set(employee.id, claimed);
    }

    try {
      const contract = await ContractService.createContract({
        employeeId: employee.id,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        wage,
        departmentId,
        position,
        salaryStructureId: structure.id,
        status: status as ContractStatus,
      });

      imported.push({
        employee: employee.name,
        employeeCode: employee.employeeCode,
        position: contract.position,
        wage: contract.wage,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate ? endDate.toISOString().slice(0, 10) : null,
        status: contract.status,
      });
    } catch (err) {
      errors.push(
        rowError(n, err instanceof Error ? err.message : 'Could not create this contract.')
      );
    }
  }

  return { imported, errors };
}
