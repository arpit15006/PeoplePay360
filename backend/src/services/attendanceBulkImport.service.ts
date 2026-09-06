import prisma from '../config/db';
import { AttendanceStatus } from '@prisma/client';
import { calculateWorkedHours } from '../utils/dates';
import { shiftContextFor, overtimeFrom, lateAgainst } from './attendance.service';
import { emitEvent, HR_AUDIENCE, SocketEvents } from '../socket/emitter';
import { BulkImportResult, lookupKey, rowError } from './bulkImport.types';

export interface AttendanceImportRow {
  rowNumber: number;
  employee?: string;
  date?: string;
  checkin?: string;
  checkout?: string;
  status?: string;
  notes?: string;
}

export interface ImportedAttendance {
  employee: string;
  employeeCode: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workedHours: number;
  status: string;
}

const STATUSES = Object.values(AttendanceStatus) as string[];
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

/**
 * Accepts the date formats a spreadsheet actually produces: ISO (2026-03-14),
 * and the day-first and month-first slash forms. Ambiguous slash dates are read
 * day-first, matching the dd/mm/yyyy convention this product's other date
 * fields use; the template says so explicitly.
 */
function parseImportDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    return buildUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (slash) {
    return buildUtcDate(Number(slash[3]), Number(slash[2]), Number(slash[1]));
  }

  return null;
}

/**
 * Builds a midnight-UTC date, rejecting values that only look like dates —
 * `new Date(2026, 1, 31)` silently rolls into March, which would file a
 * February punch under the wrong month.
 */
function buildUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

/** Zero-pads "9:05" to "09:05" so stored times sort and compare as strings. */
function padTime(value: string): string {
  const [h, m] = value.trim().split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

/**
 * Bulk-imports attendance, the way a month of biometric punches arrives.
 *
 * Worked hours and overtime are recomputed here from the employee's own
 * schedule rather than read from the file — a device export carries raw punch
 * times, and letting it supply totals would put two disagreeing numbers in the
 * database.
 */
export async function bulkImportAttendance(
  rows: AttendanceImportRow[]
): Promise<BulkImportResult<ImportedAttendance>> {
  const errors: string[] = [];
  const imported: ImportedAttendance[] = [];

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, email: true, employeeCode: true },
  });
  const byEmail = new Map(employees.map((e) => [lookupKey(e.email), e]));
  const byCode = new Map(employees.map((e) => [lookupKey(e.employeeCode), e]));

  // Attendance is unique on (employee, date). Both the in-file and in-database
  // collisions are reported distinctly, because re-uploading last month's file
  // by mistake should say so rather than fail opaquely.
  const seenInFile = new Set<string>();

  const valid: {
    row: AttendanceImportRow;
    employee: { id: string; name: string; employeeCode: string };
    date: Date;
    checkIn: string;
    checkOut: string;
    status: AttendanceStatus | null;
    notes: string | null;
  }[] = [];

  for (const row of rows) {
    const n = row.rowNumber;

    const employeeRef = String(row.employee ?? '').trim();
    if (!employeeRef) {
      errors.push(rowError(n, 'Employee is required — give an email or employee code.'));
      continue;
    }
    const employee = byEmail.get(lookupKey(employeeRef)) ?? byCode.get(lookupKey(employeeRef));
    if (!employee) {
      errors.push(rowError(n, `Employee "${employeeRef}" not found. Give an existing email or employee code.`));
      continue;
    }

    const date = parseImportDate(String(row.date ?? ''));
    if (!date) {
      errors.push(rowError(n, `Date "${row.date ?? '(blank)'}" must be yyyy-mm-dd or dd/mm/yyyy, and a real calendar date.`));
      continue;
    }
    // A punch dated next year is a typo, not a record worth keeping.
    if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      errors.push(rowError(n, `Date "${row.date}" is in the future.`));
      continue;
    }

    const checkInRaw = String(row.checkin ?? '').trim();
    if (!TIME_PATTERN.test(checkInRaw)) {
      errors.push(rowError(n, `Check-in "${row.checkin ?? '(blank)'}" must be HH:MM in 24-hour time.`));
      continue;
    }
    const checkIn = padTime(checkInRaw);

    // An empty check-out is legitimate — someone still on shift when the
    // export ran — and leaves worked hours at zero until they check out.
    const checkOutRaw = String(row.checkout ?? '').trim();
    if (checkOutRaw && !TIME_PATTERN.test(checkOutRaw)) {
      errors.push(rowError(n, `Check-out "${checkOutRaw}" must be HH:MM in 24-hour time.`));
      continue;
    }
    const checkOut = checkOutRaw ? padTime(checkOutRaw) : '';
    if (checkOut && checkOut <= checkIn) {
      errors.push(rowError(n, `Check-out ${checkOut} is not after check-in ${checkIn}. Overnight shifts must be split across two days.`));
      continue;
    }

    const statusRaw = String(row.status ?? '').trim();
    const status = statusRaw ? statusRaw.toUpperCase().replace(/[\s-]+/g, '_') : null;
    if (status && !STATUSES.includes(status)) {
      errors.push(rowError(n, `Status "${statusRaw}" must be one of ${STATUSES.join(', ')}.`));
      continue;
    }

    const key = `${employee.id}|${date.toISOString()}`;
    if (seenInFile.has(key)) {
      errors.push(rowError(n, `${employee.name} already has a row for this date earlier in the file.`));
      continue;
    }
    seenInFile.add(key);

    valid.push({
      row,
      employee,
      date,
      checkIn,
      checkOut,
      status: status as AttendanceStatus | null,
      notes: String(row.notes ?? '').trim() || null,
    });
  }

  // One query settles which of these dates are already on record, rather than
  // a findUnique per row.
  const existing = valid.length
    ? await prisma.attendance.findMany({
        where: {
          employeeId: { in: [...new Set(valid.map((v) => v.employee.id))] },
          date: { in: [...new Set(valid.map((v) => v.date.getTime()))].map((t) => new Date(t)) },
        },
        select: { employeeId: true, date: true },
      })
    : [];
  const onRecord = new Set(existing.map((e) => `${e.employeeId}|${e.date.toISOString()}`));

  for (const entry of valid) {
    const key = `${entry.employee.id}|${entry.date.toISOString()}`;
    if (onRecord.has(key)) {
      errors.push(
        rowError(entry.row.rowNumber, `${entry.employee.name} already has attendance recorded for ${entry.row.date}.`)
      );
      continue;
    }

    try {
      const shift = await shiftContextFor(entry.employee.id, entry.date);
      const workedHours = entry.checkOut
        ? calculateWorkedHours(entry.checkIn, entry.checkOut, shift.breakMinutes)
        : 0;
      const overtimeHours = entry.checkOut ? overtimeFrom(workedHours, shift.scheduledHours) : 0;

      // Same grace the single-entry path applies, recorded as a flag now.
      const status = entry.status ?? AttendanceStatus.PRESENT;
      const wasLate = lateAgainst(entry.checkIn, shift.startTime);

      const created = await prisma.attendance.create({
        data: {
          employeeId: entry.employee.id,
          date: entry.date,
          checkIn: entry.checkIn,
          checkOut: entry.checkOut,
          workedHours,
          overtimeHours,
          status,
          wasLate,
          notes: entry.notes,
        },
      });
      onRecord.add(key);

      imported.push({
        employee: entry.employee.name,
        employeeCode: entry.employee.employeeCode,
        date: entry.date.toISOString().slice(0, 10),
        checkIn: created.checkIn,
        checkOut: created.checkOut,
        workedHours: created.workedHours,
        status: created.status,
      });
    } catch (err) {
      errors.push(
        rowError(entry.row.rowNumber, err instanceof Error ? err.message : 'Could not save this attendance row.')
      );
    }
  }

  // One refresh for the whole batch — emitting per row would fire a thousand
  // socket events and re-render every connected client a thousand times.
  if (imported.length > 0) {
    // Everyone in the file would be a long list of rooms; the people who ran
    // the import and those who watch attendance are the ones who need it.
    emitEvent(SocketEvents.ATTENDANCE_UPDATED, { bulk: true, count: imported.length }, {
      roles: HR_AUDIENCE,
    });
  }

  return { imported, errors };
}
