import { AttendanceStatus } from '@prisma/client';

import { orgDayKey, orgWallTimeToInstant } from './orgTime';

/**
 * The arithmetic behind session-based attendance, with no database access.
 *
 * Kept pure so the thresholds can be reasoned about and tested on their own —
 * these numbers decide what someone is paid, and they should not be buried in
 * a service that also talks to Postgres.
 */

/** Worked at least this share of the scheduled day to be marked present. */
export const PRESENT_THRESHOLD = 0.75;
/** Below the present threshold but at least this much is a half day. */
export const HALF_DAY_THRESHOLD = 0.5;
/** Minutes after the shift starts before an arrival counts as late. */
export const LATE_GRACE_MINUTES = 15;
/** A segment silent for longer than this is closed at its last heartbeat. */
export const HEARTBEAT_TIMEOUT_MINUTES = 30;
/**
 * The most that can be credited in a day without HR intervention, as a
 * multiple of the scheduled hours. A session left open overnight would
 * otherwise invent a fourteen-hour day.
 */
export const MAX_CREDITED_MULTIPLE = 2;
/** Credited hours on a day with no schedule at all, before HR has to look. */
export const MAX_CREDITED_UNSCHEDULED_HOURS = 12;

export interface Segment {
  kind: 'WORK' | 'BREAK';
  startedAt: Date;
  endedAt: Date | null;
}

export interface DayTotals {
  workedHours: number;
  breakHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  wasLate: boolean;
  /** True when the raw total was cut back by the cap above. */
  capped: boolean;
}

const hoursBetween = (from: Date, to: Date): number =>
  Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Sums the segments of one day.
 *
 * `now` closes any segment still running, so a live day reports the same way a
 * finished one does and the screen can show a total that keeps climbing.
 */
export function sumSegments(segments: Segment[], now: Date): { worked: number; brk: number } {
  let worked = 0;
  let brk = 0;

  for (const s of segments) {
    const end = s.endedAt ?? now;
    const hours = hoursBetween(s.startedAt, end);
    if (s.kind === 'WORK') worked += hours;
    else brk += hours;
  }

  return { worked: round2(worked), brk: round2(brk) };
}

/**
 * Turns a day's segments into the summary Attendance stores.
 *
 * `scheduledHours` is already net of the unpaid meal break, and only WORK
 * segments are counted, so breaks are excluded on both sides of the comparison.
 *
 * A day with no schedule — a weekend, or an employee with no working schedule
 * — has nothing to fall short of, so any time worked counts as present and all
 * of it is overtime. That mirrors how shiftContextFor already treats them.
 */
export function summariseDay(
  segments: Segment[],
  scheduledHours: number,
  now: Date,
  shiftStart: Date | null
): DayTotals {
  const { worked: rawWorked, brk } = sumSegments(segments, now);

  const ceiling =
    scheduledHours > 0 ? scheduledHours * MAX_CREDITED_MULTIPLE : MAX_CREDITED_UNSCHEDULED_HOURS;
  const capped = rawWorked > ceiling;
  const worked = capped ? round2(ceiling) : rawWorked;

  const firstWork = segments
    .filter((s) => s.kind === 'WORK')
    .map((s) => s.startedAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const wasLate = Boolean(
    firstWork &&
      shiftStart &&
      firstWork.getTime() > shiftStart.getTime() + LATE_GRACE_MINUTES * 60_000
  );

  if (scheduledHours <= 0) {
    return {
      workedHours: worked,
      breakHours: brk,
      overtimeHours: worked,
      status: worked > 0 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
      wasLate: false,
      capped,
    };
  }

  const ratio = worked / scheduledHours;
  const status =
    ratio >= PRESENT_THRESHOLD
      ? AttendanceStatus.PRESENT
      : ratio >= HALF_DAY_THRESHOLD
        ? AttendanceStatus.HALF_DAY
        : AttendanceStatus.ABSENT;

  return {
    workedHours: worked,
    breakHours: brk,
    overtimeHours: round2(Math.max(0, worked - scheduledHours)),
    status,
    wasLate,
    capped,
  };
}

/**
 * The instant a shift begins on a given day.
 *
 * "09:00" is a wall-clock time in the organisation's own zone, so it is
 * resolved there rather than in UTC — otherwise every arrival is judged
 * against the wrong moment and nobody is ever on time.
 */
export function shiftStartOn(date: Date, startTime: string | null): Date | null {
  if (!startTime) return null;
  return orgWallTimeToInstant(date, startTime);
}

/** The key Attendance is stored under: the local calendar day, as UTC midnight. */
export function dayKey(moment: Date): Date {
  return orgDayKey(moment);
}

/** "8.95" -> "8h 57m", for the summary shown before signing out. */
export function formatHours(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}
