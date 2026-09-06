import { AttendanceSessionService } from '../services/attendanceSession.service';
import { HEARTBEAT_TIMEOUT_MINUTES } from './sessionRules';

/**
 * The two things attendance has to do when nobody is looking.
 *
 * Plain intervals rather than a scheduler: this runs as a single process, and
 * a cron dependency would buy nothing over setInterval. Both jobs are written
 * to be safe if they run twice or are missed entirely — the sweeper closes at a
 * recorded heartbeat, and marking absentees skips any day that already has a
 * row — so a restart at the wrong moment cannot corrupt a day.
 */

/** How often to look for sessions whose browser has gone quiet. */
const SWEEP_EVERY_MS = 60_000;
/** How often to check whether yesterday still needs closing off. */
const ABSENCE_CHECK_EVERY_MS = 15 * 60_000;

let sweepTimer: NodeJS.Timeout | null = null;
let absenceTimer: NodeJS.Timeout | null = null;
/** The last date already closed off, so the check is cheap on repeat runs. */
let lastAbsenceRun: string | null = null;

const yesterdayUtc = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));

async function runSweep(): Promise<void> {
  try {
    await AttendanceSessionService.sweepStaleSessions();
  } catch (err) {
    console.error('[Attendance] sweep failed:', (err as Error).message);
  }
}

/**
 * Closes off the previous day once it is safely over.
 *
 * Runs against yesterday rather than today, so a day still in progress is never
 * marked absent, and it is idempotent: the date is remembered, and the service
 * skips anyone who already has a row.
 */
async function runAbsenceMarking(): Promise<void> {
  const target = yesterdayUtc(new Date());
  const key = target.toISOString().slice(0, 10);
  if (lastAbsenceRun === key) return;

  try {
    await AttendanceSessionService.markAbsentees(target);
    lastAbsenceRun = key;
  } catch (err) {
    console.error('[Attendance] absence marking failed:', (err as Error).message);
  }
}

export function startAttendanceJobs(): void {
  if (sweepTimer) return;

  console.log(
    `[Attendance] sweeping stale sessions every ${SWEEP_EVERY_MS / 1000}s ` +
      `(timeout ${HEARTBEAT_TIMEOUT_MINUTES}m); closing off missed days every ` +
      `${ABSENCE_CHECK_EVERY_MS / 60_000}m`
  );

  sweepTimer = setInterval(runSweep, SWEEP_EVERY_MS);
  absenceTimer = setInterval(runAbsenceMarking, ABSENCE_CHECK_EVERY_MS);

  // Neither should hold the process open on shutdown.
  sweepTimer.unref?.();
  absenceTimer.unref?.();

  // A restart may have missed a sweep, so catch up rather than waiting a minute.
  void runSweep();
  void runAbsenceMarking();
}

export function stopAttendanceJobs(): void {
  if (sweepTimer) clearInterval(sweepTimer);
  if (absenceTimer) clearInterval(absenceTimer);
  sweepTimer = null;
  absenceTimer = null;
}
