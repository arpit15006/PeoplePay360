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
 */
export function calculateWorkedHours(checkIn: string, checkOut: string): number {
  const inMinutes = parseTimeToMinutes(checkIn);
  const outMinutes = parseTimeToMinutes(checkOut);
  const diff = outMinutes - inMinutes;
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
