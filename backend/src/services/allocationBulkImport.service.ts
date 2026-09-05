import prisma from '../config/db';
import { AuthUser } from '../middleware/auth';
import { assertMayDecideFor } from './timeoff.service';
import { BulkImportResult, lookupKey, rowError } from './bulkImport.types';

export interface AllocationImportRow {
  rowNumber: number;
  employee?: string;
  timeofftype?: string;
  allocated?: string;
  validityyear?: string;
}

export interface ImportedAllocation {
  employee: string;
  employeeCode: string;
  timeOffType: string;
  allocated: number;
  validityYear: number;
}

/** Mirrors the bounds the allocation form enforces. */
const MIN_YEAR = 2020;
const MAX_YEAR = 2050;

/**
 * Bulk-grants leave balances — the year-start job of giving 1,000 people their
 * annual entitlement, where the day count differs by grade or tenure and so
 * cannot be done with the existing "grant the same to everyone" flow.
 *
 * The self-grant and seniority guards from the single-grant path are applied
 * per row, so an operator cannot quietly award themselves leave inside a file.
 */
export async function bulkImportAllocations(
  rows: AllocationImportRow[],
  actor: AuthUser
): Promise<BulkImportResult<ImportedAllocation>> {
  const errors: string[] = [];
  const imported: ImportedAllocation[] = [];

  const [employees, types] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, name: true, email: true, employeeCode: true } }),
    prisma.timeOffType.findMany({ select: { id: true, name: true } }),
  ]);

  const byEmail = new Map(employees.map((e) => [lookupKey(e.email), e]));
  const byCode = new Map(employees.map((e) => [lookupKey(e.employeeCode), e]));
  const typeByName = new Map(types.map((t) => [lookupKey(t.name), t]));

  const seenInFile = new Set<string>();

  const valid: {
    row: AllocationImportRow;
    employee: { id: string; name: string; employeeCode: string };
    type: { id: string; name: string };
    allocated: number;
    validityYear: number;
  }[] = [];

  for (const row of rows) {
    const n = row.rowNumber;

    const employeeRef = String(row.employee ?? '').trim();
    const employee = byEmail.get(lookupKey(employeeRef)) ?? byCode.get(lookupKey(employeeRef));
    if (!employee) {
      errors.push(rowError(n, `Employee "${employeeRef || '(blank)'}" not found. Give an existing email or employee code.`));
      continue;
    }

    const typeRef = String(row.timeofftype ?? '').trim();
    const type = typeByName.get(lookupKey(typeRef));
    if (!type) {
      errors.push(rowError(n, `Time off type "${typeRef || '(blank)'}" not found. It must match a configured type name.`));
      continue;
    }

    // Half-days are real, so fractions are allowed; the value still has to be a
    // finite number above zero.
    const allocatedRaw = String(row.allocated ?? '').trim();
    const allocated = Number(allocatedRaw);
    if (!allocatedRaw || !Number.isFinite(allocated) || allocated <= 0) {
      errors.push(rowError(n, `Allocated days "${allocatedRaw || '(blank)'}" must be a number above zero.`));
      continue;
    }
    if (allocated > 365) {
      errors.push(rowError(n, `Allocated days "${allocatedRaw}" is more than a year.`));
      continue;
    }

    const yearRaw = String(row.validityyear ?? '').trim();
    const validityYear = yearRaw ? Number(yearRaw) : new Date().getFullYear();
    if (!Number.isInteger(validityYear) || validityYear < MIN_YEAR || validityYear > MAX_YEAR) {
      errors.push(rowError(n, `Validity year "${yearRaw}" must be a whole year between ${MIN_YEAR} and ${MAX_YEAR}.`));
      continue;
    }

    const key = `${employee.id}|${type.id}|${validityYear}`;
    if (seenInFile.has(key)) {
      errors.push(rowError(n, `${employee.name} already has a ${type.name} ${validityYear} row earlier in this file.`));
      continue;
    }
    seenInFile.add(key);

    valid.push({ row, employee, type, allocated, validityYear });
  }

  const existing = valid.length
    ? await prisma.timeOffAllocation.findMany({
        where: { employeeId: { in: [...new Set(valid.map((v) => v.employee.id))] } },
        select: { employeeId: true, timeOffTypeId: true, validityYear: true },
      })
    : [];
  const onRecord = new Set(
    existing.map((a) => `${a.employeeId}|${a.timeOffTypeId}|${a.validityYear}`)
  );

  for (const entry of valid) {
    const key = `${entry.employee.id}|${entry.type.id}|${entry.validityYear}`;
    if (onRecord.has(key)) {
      errors.push(
        rowError(entry.row.rowNumber, `${entry.employee.name} already holds a ${entry.type.name} allocation for ${entry.validityYear}.`)
      );
      continue;
    }

    try {
      await assertMayDecideFor(
        actor,
        entry.employee.id,
        'You cannot grant yourself a leave allocation. Remove your own row and have someone else grant it.'
      );

      await prisma.timeOffAllocation.create({
        data: {
          employeeId: entry.employee.id,
          timeOffTypeId: entry.type.id,
          allocated: entry.allocated,
          validityYear: entry.validityYear,
          taken: 0,
          remaining: entry.allocated,
        },
      });
      onRecord.add(key);

      imported.push({
        employee: entry.employee.name,
        employeeCode: entry.employee.employeeCode,
        timeOffType: entry.type.name,
        allocated: entry.allocated,
        validityYear: entry.validityYear,
      });
    } catch (err) {
      errors.push(
        rowError(entry.row.rowNumber, err instanceof Error ? err.message : 'Could not grant this allocation.')
      );
    }
  }

  return { imported, errors };
}
