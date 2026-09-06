import { api } from '@/api/client'
import type { ImportConfig, ImportContext, ImportResponse } from '@/components/bulk/types'

interface Envelope {
  success: boolean
  data: ImportResponse
}

/** Every importer posts the same envelope and reads the same result shape. */
const post = (path: string) => (rows: { rowNumber: number; [key: string]: unknown }[]) =>
  api.post<Envelope>(path, { rows }).then(r => r.data)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/

const key = (value: string) => value.trim().toLowerCase()

/** Enum cells are accepted in any casing, with spaces or hyphens for underscores. */
const asEnum = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_')

/**
 * Reads a date cell the way a spreadsheet writes one, returning the UTC day it
 * names. Slash dates are read day-first, which the templates state.
 *
 * Rejects dates that only look real — 31/02/2026 rolls over into March if fed
 * straight to `new Date`, quietly filing the row under the wrong month.
 */
function parseDate(raw: string): Date | null {
  const value = raw.trim()
  if (!value) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value)

  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : slash
      ? [Number(slash[3]), Number(slash[2]), Number(slash[1])]
      : [NaN, NaN, NaN]

  if (!Number.isFinite(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return real ? date : null
}

/** Formats a known-values list for an error message, without running long. */
function listFor(values: string[]): string {
  if (values.length === 0) return 'none are configured yet'
  if (values.length <= 6) return values.join(', ')
  return `${values.slice(0, 6).join(', ')} and ${values.length - 6} more`
}

/** True when the reference names an employee that exists, by email or code. */
const knowsEmployee = (reference: string, context: ImportContext) =>
  context.employeeEmails.includes(key(reference)) || context.employeeCodes.includes(key(reference))

// ── Employees ────────────────────────────────────────────────────────────────

export const employeeImportConfig: ImportConfig = {
  entity: 'employee',
  noun: 'employees',
  title: 'Import employees from CSV',
  description:
    'Add many employees at once. Each one also gets a login with its own generated password, shown once when the import finishes.',
  templateName: 'employees',
  columns: [
    { key: 'name', label: 'Name', required: true, samples: ['Ravi Sharma', 'Priya Patel'] },
    { key: 'email', label: 'Email', required: true, samples: ['ravi.sharma@peoplepay360.com', 'priya.patel@peoplepay360.com'] },
    { key: 'phone', label: 'Phone', required: true, samples: ['9876543210', '9876543211'] },
    { key: 'department', label: 'Department', required: true, samples: ['Engineering', 'Human Resources'] },
    { key: 'jobposition', label: 'Job position', required: true, samples: ['Backend Engineer', 'HR Executive'] },
    { key: 'employeetype', label: 'Type', required: false, samples: ['FULL_TIME', 'PART_TIME'] },
    { key: 'status', label: 'Status', required: false, samples: ['ACTIVE', 'ACTIVE'] },
    { key: 'manager', label: 'Manager', required: false, samples: ['', 'EMP-001'] },
    { key: 'workingschedule', label: 'Schedule', required: false, samples: ['', ''] },
    { key: 'bankname', label: 'Bank', required: false, samples: ['', ''] },
    { key: 'bankaccountnumber', label: 'Account no.', required: false, samples: ['', ''] },
    { key: 'ifsccode', label: 'IFSC', required: false, samples: ['', ''] }
  ],
  validate: (rows, context) => {
    const problems = new Map<number, string>()
    const emailsSeen = new Set<string>()

    for (const row of rows) {
      const v = row.values
      const email = key(v.email ?? '')
      let error: string | undefined

      if ((v.name ?? '').trim().length < 2) error = 'Name must be at least 2 characters.'
      else if (!EMAIL_PATTERN.test(email)) error = `"${v.email || '(blank)'}" is not a valid email address.`
      else if (emailsSeen.has(email)) error = `Duplicate email "${email}" appears earlier in this file.`
      else if (context.employeeEmails.includes(email)) error = `An employee with email "${email}" already exists.`
      else if ((v.phone ?? '').trim().length < 5) error = 'Phone must be at least 5 characters.'
      else if (!(v.department ?? '').trim()) error = 'Department is required.'
      else if (!context.departments.includes(key(v.department))) {
        error = `Department "${v.department}" not found. Known: ${listFor(context.departments)}.`
      } else if ((v.jobposition ?? '').trim().length < 2) error = 'Job position is required.'
      else if (v.employeetype && !['FULL_TIME', 'PART_TIME', 'CONTRACT'].includes(asEnum(v.employeetype))) {
        error = `Type "${v.employeetype}" must be FULL_TIME, PART_TIME or CONTRACT.`
      } else if (v.status && !['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(asEnum(v.status))) {
        error = `Status "${v.status}" must be ACTIVE, ON_LEAVE or TERMINATED.`
      } else if (v.manager && !knowsEmployee(v.manager, context)) {
        error = `Manager "${v.manager}" not found. Use an existing employee's email or code — import managers before their reports.`
      } else if (v.workingschedule && !context.schedules.includes(key(v.workingschedule))) {
        error = `Schedule "${v.workingschedule}" not found. Known: ${listFor(context.schedules)}.`
      } else if (v.ifsccode && !IFSC_PATTERN.test(v.ifsccode.trim().toUpperCase())) {
        error = `IFSC "${v.ifsccode}" must look like HDFC0001234.`
      } else if (v.bankaccountnumber && v.bankaccountnumber.trim().length < 4) {
        error = 'Bank account number looks too short.'
      }

      if (email) emailsSeen.add(email)
      if (error) problems.set(row.rowNumber, error)
    }

    return problems
  },
  submit: post('/employees/bulk-import'),
  resultColumns: [
    { key: 'employeeCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'tempPassword', label: 'Temporary password', mono: true }
  ],
  credentialsColumn: 'tempPassword'
}

// ── Users ────────────────────────────────────────────────────────────────────

export const userImportConfig: ImportConfig = {
  entity: 'user',
  noun: 'users',
  title: 'Import user accounts from CSV',
  description:
    'Create many logins at once. Each gets its own generated password, shown once when the import finishes.',
  templateName: 'users',
  columns: [
    { key: 'name', label: 'Name', required: true, samples: ['Ravi Sharma', 'Priya Patel'] },
    { key: 'email', label: 'Email', required: true, samples: ['ravi.sharma@peoplepay360.com', 'priya.patel@peoplepay360.com'] },
    { key: 'role', label: 'Role', required: true, samples: ['HR_MANAGER', 'EMPLOYEE'] },
    { key: 'employee', label: 'Employee', required: false, samples: ['', 'EMP-002'] },
    { key: 'isactive', label: 'Active', required: false, samples: ['yes', 'yes'] }
  ],
  validate: (rows, context) => {
    const problems = new Map<number, string>()
    const emailsSeen = new Set<string>()
    const employeesClaimed = new Set<string>()
    const roles = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

    for (const row of rows) {
      const v = row.values
      const email = key(v.email ?? '')
      const role = asEnum(v.role ?? '')
      const employeeRef = key(v.employee ?? '')
      let error: string | undefined

      if ((v.name ?? '').trim().length < 2) error = 'Name must be at least 2 characters.'
      else if (!EMAIL_PATTERN.test(email)) error = `"${v.email || '(blank)'}" is not a valid email address.`
      else if (emailsSeen.has(email)) error = `Duplicate email "${email}" appears earlier in this file.`
      else if (!roles.includes(role)) error = `Role "${v.role || '(blank)'}" must be one of ${roles.join(', ')}.`
      else if (v.isactive && !['YES', 'NO', 'TRUE', 'FALSE', 'Y', 'N', '1', '0', 'ACTIVE', 'INACTIVE'].includes(asEnum(v.isactive))) {
        error = `Active "${v.isactive}" must be yes or no.`
      } else if (employeeRef && !knowsEmployee(employeeRef, context)) {
        error = `Employee "${v.employee}" not found. Give an existing employee's email or code.`
      } else if (employeeRef && employeesClaimed.has(employeeRef)) {
        error = `"${v.employee}" is already linked to an earlier row in this file.`
      } else if (!employeeRef && role === 'EMPLOYEE') {
        error = 'An Employee-role account needs an "employee" to link to, or it cannot see its own record.'
      }

      if (email) emailsSeen.add(email)
      if (employeeRef) employeesClaimed.add(employeeRef)
      if (error) problems.set(row.rowNumber, error)
    }

    return problems
  },
  submit: post('/users/bulk-import'),
  resultColumns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'employee', label: 'Employee' },
    { key: 'tempPassword', label: 'Temporary password', mono: true }
  ],
  credentialsColumn: 'tempPassword'
}

// ── Attendance ───────────────────────────────────────────────────────────────

export const attendanceImportConfig: ImportConfig = {
  entity: 'attendance',
  noun: 'attendance rows',
  title: 'Import attendance from CSV',
  description:
    'Load a period of attendance — a biometric export, for instance. Worked hours and overtime are recalculated from each employee’s own schedule.',
  templateName: 'attendance',
  columns: [
    { key: 'employee', label: 'Employee', required: true, samples: ['EMP-001', 'ravi.sharma@peoplepay360.com'] },
    { key: 'date', label: 'Date', required: true, samples: ['2026-03-02', '02/03/2026'] },
    { key: 'checkin', label: 'Check in', required: true, samples: ['09:00', '09:12'] },
    { key: 'checkout', label: 'Check out', required: false, samples: ['18:00', '18:30'] },
    { key: 'status', label: 'Status', required: false, samples: ['', 'HALF_DAY'] },
    { key: 'notes', label: 'Notes', required: false, samples: ['', ''] }
  ],
  validate: (rows, context) => {
    const problems = new Map<number, string>()
    const seen = new Set<string>()
    // Late is derived from the check-in time against the shift, not imported.
    const statuses = ['PRESENT', 'HALF_DAY', 'ABSENT']
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000

    for (const row of rows) {
      const v = row.values
      const employeeRef = key(v.employee ?? '')
      const date = parseDate(v.date ?? '')
      const checkIn = (v.checkin ?? '').trim()
      const checkOut = (v.checkout ?? '').trim()
      let error: string | undefined

      if (!employeeRef) error = 'Employee is required — give an email or employee code.'
      else if (!knowsEmployee(employeeRef, context)) {
        error = `Employee "${v.employee}" not found. Give an existing email or employee code.`
      } else if (!date) {
        error = `Date "${v.date || '(blank)'}" must be yyyy-mm-dd or dd/mm/yyyy, and a real calendar date.`
      } else if (date.getTime() > tomorrow) error = `Date "${v.date}" is in the future.`
      else if (!TIME_PATTERN.test(checkIn)) {
        error = `Check-in "${v.checkin || '(blank)'}" must be HH:MM in 24-hour time.`
      } else if (checkOut && !TIME_PATTERN.test(checkOut)) {
        error = `Check-out "${checkOut}" must be HH:MM in 24-hour time.`
      } else if (checkOut && pad(checkOut) <= pad(checkIn)) {
        error = `Check-out ${checkOut} is not after check-in ${checkIn}. Split overnight shifts across two days.`
      } else if (v.status && !statuses.includes(asEnum(v.status))) {
        error = `Status "${v.status}" must be one of ${statuses.join(', ')}.`
      } else {
        const dedupe = `${employeeRef}|${date.toISOString()}`
        if (seen.has(dedupe)) error = `"${v.employee}" already has a row for ${v.date} earlier in this file.`
        else seen.add(dedupe)
      }

      if (error) problems.set(row.rowNumber, error)
    }

    return problems
  },
  submit: post('/attendance/bulk-import'),
  resultColumns: [
    { key: 'employeeCode', label: 'Code' },
    { key: 'employee', label: 'Employee' },
    { key: 'date', label: 'Date' },
    { key: 'checkIn', label: 'In' },
    { key: 'checkOut', label: 'Out' },
    { key: 'workedHours', label: 'Hours' },
    { key: 'status', label: 'Status' }
  ]
}

/** "9:05" and "09:05" must compare equal, so times are padded before sorting. */
function pad(time: string): string {
  const [h, m] = time.trim().split(':')
  return `${h.padStart(2, '0')}:${m}`
}

// ── Time off allocations ─────────────────────────────────────────────────────

export const allocationImportConfig: ImportConfig = {
  entity: 'allocation',
  noun: 'allocations',
  title: 'Import leave balances from CSV',
  description:
    'Grant leave balances in bulk — the year-start job, where the number of days differs per employee.',
  templateName: 'allocations',
  columns: [
    { key: 'employee', label: 'Employee', required: true, samples: ['EMP-001', 'EMP-002'] },
    { key: 'timeofftype', label: 'Type', required: true, samples: ['Annual Leave', 'Sick Leave'] },
    { key: 'allocated', label: 'Days', required: true, samples: ['24', '12'] },
    { key: 'validityyear', label: 'Year', required: false, samples: [String(new Date().getFullYear()), String(new Date().getFullYear())] }
  ],
  validate: (rows, context) => {
    const problems = new Map<number, string>()
    const seen = new Set<string>()

    for (const row of rows) {
      const v = row.values
      const employeeRef = key(v.employee ?? '')
      const type = key(v.timeofftype ?? '')
      const allocated = Number((v.allocated ?? '').trim())
      const yearRaw = (v.validityyear ?? '').trim()
      const year = yearRaw ? Number(yearRaw) : new Date().getFullYear()
      let error: string | undefined

      if (!knowsEmployee(employeeRef, context)) {
        error = `Employee "${v.employee || '(blank)'}" not found. Give an existing email or employee code.`
      } else if (!context.timeOffTypes.includes(type)) {
        error = `Time off type "${v.timeofftype || '(blank)'}" not found. Known: ${listFor(context.timeOffTypes)}.`
      } else if (!(v.allocated ?? '').trim() || !Number.isFinite(allocated) || allocated <= 0) {
        error = `Days "${v.allocated || '(blank)'}" must be a number above zero.`
      } else if (allocated > 365) error = `Days "${v.allocated}" is more than a year.`
      else if (!Number.isInteger(year) || year < 2020 || year > 2050) {
        error = `Year "${yearRaw}" must be a whole year between 2020 and 2050.`
      } else {
        const dedupe = `${employeeRef}|${type}|${year}`
        if (seen.has(dedupe)) {
          error = `"${v.employee}" already has a ${v.timeofftype} ${year} row earlier in this file.`
        } else seen.add(dedupe)
      }

      if (error) problems.set(row.rowNumber, error)
    }

    return problems
  },
  submit: post('/timeoff/allocations/bulk-import'),
  resultColumns: [
    { key: 'employeeCode', label: 'Code' },
    { key: 'employee', label: 'Employee' },
    { key: 'timeOffType', label: 'Type' },
    { key: 'allocated', label: 'Days' },
    { key: 'validityYear', label: 'Year' }
  ]
}

// ── Contracts ────────────────────────────────────────────────────────────────

export const contractImportConfig: ImportConfig = {
  entity: 'contract',
  noun: 'contracts',
  title: 'Import contracts from CSV',
  description:
    'Create many contracts at once — an annual wage revision, for instance. Only ACTIVE contracts are checked for overlapping periods.',
  templateName: 'contracts',
  columns: [
    { key: 'employee', label: 'Employee', required: true, samples: ['EMP-001', 'EMP-002'] },
    { key: 'startdate', label: 'Start', required: true, samples: ['2026-04-01', '2026-04-01'] },
    { key: 'enddate', label: 'End', required: false, samples: ['', '2027-03-31'] },
    { key: 'wage', label: 'Wage', required: true, samples: ['85000', '72000'] },
    { key: 'position', label: 'Position', required: true, samples: ['Backend Engineer', 'HR Executive'] },
    { key: 'salarystructure', label: 'Structure', required: true, samples: ['Regular Salary', 'Regular Salary'] },
    { key: 'department', label: 'Department', required: false, samples: ['', ''] },
    { key: 'status', label: 'Status', required: false, samples: ['DRAFT', 'ACTIVE'] }
  ],
  validate: (rows, context) => {
    const problems = new Map<number, string>()
    // Active periods claimed by earlier rows, per employee reference.
    const claimed = new Map<string, { start: number; end: number; row: number }[]>()

    for (const row of rows) {
      const v = row.values
      const employeeRef = key(v.employee ?? '')
      const start = parseDate(v.startdate ?? '')
      const endRaw = (v.enddate ?? '').trim()
      const end = endRaw ? parseDate(endRaw) : null
      const wage = Number((v.wage ?? '').trim().replace(/[,\s₹$]/g, ''))
      const status = v.status ? asEnum(v.status) : 'DRAFT'
      let error: string | undefined

      if (!knowsEmployee(employeeRef, context)) {
        error = `Employee "${v.employee || '(blank)'}" not found. Give an existing email or employee code.`
      } else if (!start) {
        error = `Start date "${v.startdate || '(blank)'}" must be yyyy-mm-dd or dd/mm/yyyy.`
      } else if (endRaw && !end) {
        error = `End date "${endRaw}" must be yyyy-mm-dd or dd/mm/yyyy.`
      } else if (end && end < start) {
        error = `End date ${endRaw} is before the start date ${v.startdate}.`
      } else if (!(v.wage ?? '').trim() || !Number.isFinite(wage) || wage <= 0) {
        error = `Wage "${v.wage || '(blank)'}" must be a number above zero.`
      } else if ((v.position ?? '').trim().length < 2) error = 'Position is required.'
      else if (!context.salaryStructures.includes(key(v.salarystructure ?? ''))) {
        error = `Salary structure "${v.salarystructure || '(blank)'}" not found. Known: ${listFor(context.salaryStructures)}.`
      } else if (v.department && !context.departments.includes(key(v.department))) {
        error = `Department "${v.department}" not found. Known: ${listFor(context.departments)}.`
      } else if (!['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'].includes(status)) {
        error = `Status "${v.status}" must be DRAFT, ACTIVE, EXPIRED or TERMINATED.`
      } else if (status === 'ACTIVE') {
        const periods = claimed.get(employeeRef) ?? []
        const startAt = start.getTime()
        const endAt = end?.getTime() ?? Infinity
        const clash = periods.find(p => startAt <= p.end && p.start <= endAt)
        if (clash) {
          error = `"${v.employee}" already has an active contract covering this period on row ${clash.row}.`
        } else {
          periods.push({ start: startAt, end: endAt, row: row.rowNumber })
          claimed.set(employeeRef, periods)
        }
      }

      if (error) problems.set(row.rowNumber, error)
    }

    return problems
  },
  submit: post('/contracts/bulk-import'),
  resultColumns: [
    { key: 'employeeCode', label: 'Code' },
    { key: 'employee', label: 'Employee' },
    { key: 'position', label: 'Position' },
    { key: 'wage', label: 'Wage' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: 'status', label: 'Status' }
  ]
}
