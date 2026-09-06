/**
 * The organisation's own clock.
 *
 * Shifts are written as bare wall-clock strings — "09:00" to "18:00" — and the
 * attendance rows already on record store the same, so a check-in at nine in
 * the morning reads "09:00". The server runs in UTC, and in India that same
 * moment is 03:30, so formatting timestamps in UTC would file every arrival
 * three and a half hours early and make a punctual employee look absent.
 *
 * Everything here converts between the two. `Intl` does the work, so there is
 * no dependency and no offset table to maintain.
 */

/** Where the business runs. Indian payroll throughout, hence the default. */
export const ORG_TIMEZONE = process.env.ORG_TIMEZONE || 'Asia/Kolkata';

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ORG_TIMEZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** A moment broken into the organisation's local calendar and clock. */
export function orgParts(at: Date): Parts {
  const found: Record<string, string> = {};
  for (const part of formatter.formatToParts(at)) {
    if (part.type !== 'literal') found[part.type] = part.value;
  }
  return {
    year: Number(found.year),
    month: Number(found.month),
    day: Number(found.day),
    // Some locales render midnight as 24; normalise it back to 0.
    hour: Number(found.hour) % 24,
    minute: Number(found.minute),
    second: Number(found.second),
  };
}

/**
 * The calendar day a moment falls on locally, as the UTC midnight that
 * Attendance.date is keyed by. Late on the 7th in India is still the 7th, even
 * though UTC has not got there yet.
 */
export function orgDayKey(at: Date): Date {
  const p = orgParts(at);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/** "09:05" — the shape check-in and check-out have always been stored in. */
export function orgClock(at: Date): string {
  const p = orgParts(at);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/**
 * The instant at which a local wall-clock time occurs on a given day.
 *
 * Guess the moment as though local were UTC, read back what that guess looks
 * like locally, and shift by the difference. Exact for a zone without daylight
 * saving, which India is, and correct to the hour elsewhere.
 */
export function orgWallTimeToInstant(dayKeyUtc: Date, wallTime: string): Date | null {
  const [h, m] = wallTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  const guess = Date.UTC(
    dayKeyUtc.getUTCFullYear(),
    dayKeyUtc.getUTCMonth(),
    dayKeyUtc.getUTCDate(),
    h,
    m
  );
  const seen = orgParts(new Date(guess));
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, seen.second);
  return new Date(guess - (seenAsUtc - guess));
}
