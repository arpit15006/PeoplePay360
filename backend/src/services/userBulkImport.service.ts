import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import {
  BulkImportResult,
  generateTempPassword,
  lookupKey,
  rowError,
} from './bulkImport.types';

export interface UserImportRow {
  rowNumber: number;
  name?: string;
  email?: string;
  role?: string;
  employee?: string;
  isactive?: string;
}

export interface ImportedUser {
  name: string;
  email: string;
  role: string;
  employee: string | null;
  tempPassword: string;
}

const ROLES = Object.values(Role) as string[];

/** "yes"/"true"/"1"/"active" all mean active; blank defaults to active. */
function parseActive(value: string | undefined): boolean | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return true;
  if (['true', 'yes', 'y', '1', 'active'].includes(raw)) return true;
  if (['false', 'no', 'n', '0', 'inactive'].includes(raw)) return false;
  return null;
}

/**
 * Bulk-creates login accounts.
 *
 * Each account gets its own generated password, returned once so the operator
 * can hand them out; they are hashed on the way in and cannot be read back
 * afterwards.
 */
export async function bulkImportUsers(
  rows: UserImportRow[]
): Promise<BulkImportResult<ImportedUser>> {
  const errors: string[] = [];
  const imported: ImportedUser[] = [];

  const [existingUsers, employees] = await Promise.all([
    prisma.user.findMany({ select: { email: true, employeeId: true } }),
    prisma.employee.findMany({
      select: { id: true, name: true, email: true, employeeCode: true, user: { select: { id: true } } },
    }),
  ]);

  const takenEmails = new Set(existingUsers.map((u) => lookupKey(u.email)));
  const employeeByEmail = new Map(employees.map((e) => [lookupKey(e.email), e]));
  const employeeByCode = new Map(employees.map((e) => [lookupKey(e.employeeCode), e]));

  const emailsSeen = new Set<string>();
  // User.employeeId is unique — one login per employee. A file that links two
  // accounts to the same person must be caught here as well as against the DB.
  const employeesClaimedInFile = new Set<string>();

  const valid: {
    row: UserImportRow;
    data: { name: string; email: string; role: Role; employeeId: string | null; employeeLabel: string | null; isActive: boolean };
  }[] = [];

  for (const row of rows) {
    const n = row.rowNumber;
    const name = String(row.name ?? '').trim();
    const email = lookupKey(row.email);

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
    if (takenEmails.has(email)) {
      errors.push(rowError(n, `A user with email "${email}" already exists.`));
      continue;
    }

    const role = String(row.role ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!ROLES.includes(role)) {
      errors.push(rowError(n, `Role "${row.role ?? '(blank)'}" must be one of ${ROLES.join(', ')}.`));
      continue;
    }

    const isActive = parseActive(row.isactive);
    if (isActive === null) {
      errors.push(rowError(n, `Active "${row.isactive}" must be yes or no.`));
      continue;
    }

    // Linking to an employee record is optional, but an EMPLOYEE-role account
    // that is not linked can never resolve "my own record" on any screen.
    let employeeId: string | null = null;
    let employeeLabel: string | null = null;
    const employeeRef = String(row.employee ?? '').trim();
    if (employeeRef) {
      const employee =
        employeeByEmail.get(lookupKey(employeeRef)) ?? employeeByCode.get(lookupKey(employeeRef));
      if (!employee) {
        errors.push(rowError(n, `Employee "${employeeRef}" not found. Give an existing employee's email or code.`));
        continue;
      }
      if (employee.user) {
        errors.push(rowError(n, `${employee.name} already has a user account.`));
        continue;
      }
      if (employeesClaimedInFile.has(employee.id)) {
        errors.push(rowError(n, `${employee.name} is already linked to an earlier row in this file.`));
        continue;
      }
      employeesClaimedInFile.add(employee.id);
      employeeId = employee.id;
      employeeLabel = employee.name;
    } else if (role === Role.EMPLOYEE) {
      errors.push(rowError(n, 'An Employee-role account needs an "employee" to link to, or it cannot see its own record.'));
      continue;
    }

    valid.push({
      row,
      data: { name, email, role: role as Role, employeeId, employeeLabel, isActive },
    });
  }

  for (const { row, data } of valid) {
    const tempPassword = generateTempPassword();
    try {
      await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: await bcrypt.hash(tempPassword, 10),
          role: data.role,
          employeeId: data.employeeId,
          isActive: data.isActive,
        },
      });
      imported.push({
        name: data.name,
        email: data.email,
        role: data.role,
        employee: data.employeeLabel,
        tempPassword,
      });
    } catch (err) {
      errors.push(
        rowError(row.rowNumber, err instanceof Error ? err.message : 'Could not create this user.')
      );
    }
  }

  return { imported, errors };
}
