import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { EmployeeStatus, EmployeeType, Role } from '@prisma/client';
import {
  BulkImportResult,
  generateTempPassword,
  lookupKey,
  rowError,
} from './bulkImport.types';

/**
 * One parsed CSV row, as the browser hands it over. Everything is a string
 * because that is all a CSV holds; coercion and validation happen here.
 */
export interface EmployeeImportRow {
  rowNumber: number;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  jobposition?: string;
  employeetype?: string;
  status?: string;
  manager?: string;
  workingschedule?: string;
  bankname?: string;
  bankaccountnumber?: string;
  ifsccode?: string;
}

export interface ImportedEmployee {
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  jobPosition: string;
  tempPassword?: string;
}

const EMPLOYEE_TYPES = Object.values(EmployeeType) as string[];
const EMPLOYEE_STATUSES = Object.values(EmployeeStatus) as string[];
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Accepts "Full Time", "full-time" and "FULL_TIME" as the same thing. */
function normaliseEnum(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

/**
 * Bulk-creates employees from a parsed CSV.
 *
 * Every rule the browser applied is applied again here, because the browser is
 * not a trust boundary — and because the browser validated against a snapshot
 * of the data that may have moved on since the file was picked. Two operators
 * importing overlapping rosters at the same time is exactly the case row-level
 * re-validation exists for.
 *
 * Rows are processed one at a time rather than in a single transaction: a
 * partial import is the desired outcome, so one bad row must not roll back the
 * 999 good ones.
 */
export async function bulkImportEmployees(
  rows: EmployeeImportRow[]
): Promise<BulkImportResult<ImportedEmployee>> {
  const errors: string[] = [];
  const imported: ImportedEmployee[] = [];

  // Reference data is read once, not per row — a 1,000-row file would
  // otherwise issue 1,000 department lookups.
  const [departments, schedules, existingEmployees] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.workingSchedule.findMany({ select: { id: true, name: true } }),
    prisma.employee.findMany({ select: { id: true, name: true, email: true, employeeCode: true } }),
  ]);

  const deptByName = new Map(departments.map((d) => [lookupKey(d.name), d]));
  const scheduleByName = new Map(schedules.map((s) => [lookupKey(s.name), s]));
  const employeeByEmail = new Map(existingEmployees.map((e) => [lookupKey(e.email), e]));
  // Managers may be named by email or by employee code; both resolve here.
  const employeeByCode = new Map(existingEmployees.map((e) => [lookupKey(e.employeeCode), e]));

  // Duplicates *within the file* are caught separately from duplicates against
  // the database — the operator needs to know which of the two it is.
  const emailsSeen = new Set<string>();

  const valid: {
    row: EmployeeImportRow;
    data: {
      name: string;
      email: string;
      phone: string;
      departmentId: string;
      departmentName: string;
      jobPosition: string;
      employeeType: EmployeeType;
      status: EmployeeStatus;
      scheduleId: string | null;
      managerId: string | null;
      bankName: string | null;
      bankAccountNumber: string | null;
      ifscCode: string | null;
    };
  }[] = [];

  for (const row of rows) {
    const n = row.rowNumber;
    const name = String(row.name ?? '').trim();
    const email = lookupKey(row.email);
    const phone = String(row.phone ?? '').trim();

    if (name.length < 2) {
      errors.push(rowError(n, 'Name must be at least 2 characters.'));
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(rowError(n, `"${row.email ?? '(blank)'}" is not a valid email address.`));
      continue;
    }
    if (emailsSeen.has(email)) {
      errors.push(rowError(n, `Duplicate email "${email}" appears earlier in this file.`));
      continue;
    }
    emailsSeen.add(email);

    if (employeeByEmail.has(email)) {
      errors.push(rowError(n, `An employee with email "${email}" already exists.`));
      continue;
    }
    if (phone.length < 5) {
      errors.push(rowError(n, 'Phone must be at least 5 characters.'));
      continue;
    }

    const departmentName = String(row.department ?? '').trim();
    if (!departmentName) {
      errors.push(rowError(n, 'Department is required.'));
      continue;
    }
    const department = deptByName.get(lookupKey(departmentName));
    if (!department) {
      errors.push(
        rowError(n, `Department "${departmentName}" not found. It must match an existing department name exactly.`)
      );
      continue;
    }

    const jobPosition = String(row.jobposition ?? '').trim();
    if (jobPosition.length < 2) {
      errors.push(rowError(n, 'Job position is required.'));
      continue;
    }

    // Blank enum cells fall back to the same defaults the single-employee form
    // uses, so a minimal three-column file still imports.
    const typeRaw = String(row.employeetype ?? '').trim();
    const employeeType = typeRaw ? normaliseEnum(typeRaw) : EmployeeType.FULL_TIME;
    if (!EMPLOYEE_TYPES.includes(employeeType)) {
      errors.push(rowError(n, `Employee type "${typeRaw}" must be one of ${EMPLOYEE_TYPES.join(', ')}.`));
      continue;
    }

    const statusRaw = String(row.status ?? '').trim();
    const status = statusRaw ? normaliseEnum(statusRaw) : EmployeeStatus.ACTIVE;
    if (!EMPLOYEE_STATUSES.includes(status)) {
      errors.push(rowError(n, `Status "${statusRaw}" must be one of ${EMPLOYEE_STATUSES.join(', ')}.`));
      continue;
    }

    // A manager named in the file must already exist. Naming a manager who is
    // themselves further down the same file is rejected rather than guessed
    // at — the operator imports managers first, then their reports.
    let managerId: string | null = null;
    const managerRef = String(row.manager ?? '').trim();
    if (managerRef) {
      const manager =
        employeeByEmail.get(lookupKey(managerRef)) ?? employeeByCode.get(lookupKey(managerRef));
      if (!manager) {
        errors.push(
          rowError(n, `Manager "${managerRef}" not found. Give an existing employee's email or code, and import managers before their reports.`)
        );
        continue;
      }
      managerId = manager.id;
    }

    let scheduleId: string | null = null;
    const scheduleRef = String(row.workingschedule ?? '').trim();
    if (scheduleRef) {
      const schedule = scheduleByName.get(lookupKey(scheduleRef));
      if (!schedule) {
        errors.push(rowError(n, `Working schedule "${scheduleRef}" not found.`));
        continue;
      }
      scheduleId = schedule.id;
    }

    // Bank details are optional as a group, but an IFSC that is present must be
    // well-formed — a payrun that reaches finalisation with a bad one fails far
    // from here, where the cause is no longer obvious.
    const ifscRaw = String(row.ifsccode ?? '').trim().toUpperCase();
    if (ifscRaw && !IFSC_PATTERN.test(ifscRaw)) {
      errors.push(rowError(n, `IFSC "${ifscRaw}" must look like HDFC0001234.`));
      continue;
    }
    const accountRaw = String(row.bankaccountnumber ?? '').trim();
    if (accountRaw && accountRaw.length < 4) {
      errors.push(rowError(n, 'Bank account number looks too short.'));
      continue;
    }

    valid.push({
      row,
      data: {
        name,
        email,
        phone,
        departmentId: department.id,
        departmentName: department.name,
        jobPosition,
        employeeType: employeeType as EmployeeType,
        status: status as EmployeeStatus,
        scheduleId,
        managerId,
        bankName: String(row.bankname ?? '').trim() || null,
        bankAccountNumber: accountRaw || null,
        ifscCode: ifscRaw || null,
      },
    });
  }

  // Employee codes are generated from a running count. Taking the highest
  // existing EMP-nnn once and incrementing locally avoids both the N+1 count
  // queries and the collisions a per-row `count() + 1` would produce.
  let nextCode = existingEmployees.reduce((max, e) => {
    const match = /^EMP-(\d+)$/.exec(e.employeeCode);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  for (const { row, data } of valid) {
    const { departmentName, ...employeeData } = data;
    try {
      nextCode += 1;
      const employee = await prisma.employee.create({
        data: { ...employeeData, employeeCode: `EMP-${String(nextCode).padStart(3, '0')}` },
      });

      // Mirrors EmployeeService.createEmployee: every employee gets a login so
      // they appear in User Management. Unlike the single-create path this
      // issues a random password per account rather than a shared default.
      let tempPassword: string | undefined;
      try {
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (!existingUser) {
          tempPassword = generateTempPassword();
          await prisma.user.create({
            data: {
              name: employee.name,
              email: employee.email,
              password: await bcrypt.hash(tempPassword, 10),
              role: Role.EMPLOYEE,
              employeeId: employee.id,
            },
          });
        } else if (!existingUser.employeeId) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { employeeId: employee.id },
          });
        }
      } catch (err) {
        // The employee record is the point of the import; a login that could
        // not be minted is reported, not rolled back.
        errors.push(
          rowError(row.rowNumber, `Employee created, but the login could not be: ${err instanceof Error ? err.message : 'unknown error'}`)
        );
      }

      imported.push({
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        department: departmentName,
        jobPosition: employee.jobPosition,
        tempPassword,
      });
    } catch (err) {
      errors.push(
        rowError(row.rowNumber, err instanceof Error ? err.message : 'Could not create this employee.')
      );
    }
  }

  return { imported, errors };
}
