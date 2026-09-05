/**
 * Parse a time string like "09:05" into total minutes from midnight.
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate worked hours between checkIn and checkOut time strings.
 * Returns hours as a decimal (e.g. 8.95 for 8h 57m).
 *
 * The unpaid meal break is excluded, matching how working schedules derive
 * their weekly hours: a 09:00-18:00 day with a 60 minute break is 8 hours
 * worked, not 9. Counting the break would have made the same day read as 8
 * hours on the schedule and 9 on the attendance record.
 *
 * Only the meal break belongs here. Short rest breaks are paid time and are
 * not modelled separately, so `breakMinutes` should carry the unpaid meal
 * break alone. Pass 0 (the default) when no schedule applies, so an employee
 * without one keeps the raw clocked span rather than losing an arbitrary hour.
 */
export function calculateWorkedHours(
  checkIn: string,
  checkOut: string,
  breakMinutes = 0
): number {
  const inMinutes = parseTimeToMinutes(checkIn);
  const outMinutes = parseTimeToMinutes(checkOut);

  // A short shift must never be driven negative by a full meal break.
  const diff = Math.max(0, outMinutes - inMinutes - Math.max(0, breakMinutes));

  return Math.round((diff / 60) * 100) / 100; // round to 2 decimals
}

/**
 * Format a worked hours decimal to "Xh Ym" string.
 * e.g. 8.95 → "8h 57m"
 */
export function formatWorkedHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/**
 * Get the number of working days in a date range (Mon-Fri).
 */
export function getWorkingDaysInRange(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Get the month name + year from a date.
 * e.g. "September 2026"
 */
export function getMonthYearString(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}
