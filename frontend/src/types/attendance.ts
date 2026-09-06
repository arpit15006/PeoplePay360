/** Late is a flag on the record now, not a status — see AttendanceRow.wasLate. */
export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT';

export interface AttendanceRow {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workedHours: number;
  /** Hours beyond the scheduled day, derived by the server. */
  overtimeHours: number;
  /** True when an authorised user corrected the record. */
  manuallyEdited: boolean;
  status: AttendanceStatus;
  notes: string | null;
  employee: { id: string; name: string; employeeCode: string } | null;
}

export type AttendanceInput = {
  employeeId?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  notes?: string | null;
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absent',
};

/** 8.95 -> "8h 57m", matching the PRD's attendance examples. */
export const formatWorkedHours = (hours: number) => {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h ${minutes}m`;
};

/** Attendance dates are calendar dates stored as UTC — format them as such. */
export const formatAttendanceDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' });
