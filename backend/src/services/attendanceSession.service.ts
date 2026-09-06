import { AttendanceStatus, SessionEnd, SessionKind } from '@prisma/client';

import prisma from '../config/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { emitEvent, SocketEvents } from '../socket/emitter';
import { orgClock } from '../attendance/orgTime';
import {
  HEARTBEAT_TIMEOUT_MINUTES,
  dayKey,
  formatHours,
  shiftStartOn,
  summariseDay,
  type Segment,
} from '../attendance/sessionRules';

/**
 * Attendance as a running session rather than a pair of typed-in times.
 *
 * Every timestamp here comes from the server clock. The browser posts events —
 * started, paused, resumed, stopped, still here — and never says how long it
 * has been working, so putting the laptop clock forward earns nobody an hour.
 */

/** What the widget needs to draw itself. */
export interface SessionState {
  attendanceId: string | null;
  date: string;
  /** WORK while the clock runs, BREAK while paused, null before the first check-in. */
  running: SessionKind | null;
  startedAt: string | null;
  workedHours: number;
  breakHours: number;
  scheduledHours: number;
  breakAllowanceMinutes: number;
  shiftStart: string | null;
  shiftEnd: string | null;
  isWorkingDay: boolean;
  status: AttendanceStatus;
  wasLate: boolean;
  /** A segment the sweeper closed that still owes an explanation. */
  unexplained: { id: string; endedAt: string; minutesLost: number } | null;
  segments: {
    id: string;
    kind: SessionKind;
    startedAt: string;
    endedAt: string | null;
    endedBy: SessionEnd | null;
    reason: string | null;
  }[];
}

interface ShiftForDay {
  scheduledHours: number;
  breakMinutes: number;
  startTime: string | null;
  endTime: string | null;
  isWorkingDay: boolean;
}

const parseTimeToMinutes = (value: string): number => {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * The shift that applies on a given day.
 *
 * Mirrors shiftContextFor in attendance.service, but also returns the clock
 * times, which the session needs in order to decide lateness.
 */
export async function shiftForDay(employeeId: string, date: Date): Promise<ShiftForDay> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      workingSchedule: {
        select: {
          dailyShifts: {
            where: { dayOfWeek: date.getUTCDay() },
            select: { breakMinutes: true, isWorkingDay: true, startTime: true, endTime: true },
          },
        },
      },
    },
  });

  const shift = employee?.workingSchedule?.dailyShifts[0];
  if (!shift || !shift.isWorkingDay) {
    return {
      scheduledHours: 0,
      breakMinutes: 0,
      startTime: shift?.startTime ?? null,
      endTime: shift?.endTime ?? null,
      isWorkingDay: false,
    };
  }

  const span =
    parseTimeToMinutes(shift.endTime) - parseTimeToMinutes(shift.startTime) - shift.breakMinutes;

  return {
    scheduledHours: Math.max(0, Math.round((span / 60) * 100) / 100),
    breakMinutes: shift.breakMinutes,
    startTime: shift.startTime,
    endTime: shift.endTime,
    isWorkingDay: true,
  };
}

/** "09:05" in the organisation's zone, the shape Attendance has always stored. */
const clock = (at: Date): string => orgClock(at);

export class AttendanceSessionService {
  /**
   * Recomputes the day's summary from its segments.
   *
   * Attendance keeps the shape payroll, the dashboard, the PDF and the CSV
   * import already read — checkIn is the first segment's start and checkOut the
   * last one's end — so none of them need to know sessions exist.
   */
  static async recomputeDay(attendanceId: string, now = new Date()) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { sessions: { orderBy: { startedAt: 'asc' } } },
    });
    if (!attendance) throw new NotFoundError('Attendance');

    // A record HR has corrected by hand is theirs, not the clock's.
    if (attendance.manuallyEdited) return attendance;

    const shift = await shiftForDay(attendance.employeeId, attendance.date);
    const segments: Segment[] = attendance.sessions.map((s) => ({
      kind: s.kind === SessionKind.BREAK ? 'BREAK' : 'WORK',
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }));

    const totals = summariseDay(
      segments,
      shift.scheduledHours,
      now,
      shiftStartOn(attendance.date, shift.startTime)
    );

    const workSegments = attendance.sessions.filter((s) => s.kind === SessionKind.WORK);
    const first = workSegments[0];
    const lastEnded = [...workSegments].reverse().find((s) => s.endedAt);

    return prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkIn: first ? clock(first.startedAt) : '',
        checkOut: lastEnded?.endedAt ? clock(lastEnded.endedAt) : '',
        workedHours: totals.workedHours,
        overtimeHours: totals.overtimeHours,
        status: totals.status,
        wasLate: totals.wasLate,
      },
    });
  }

  /** The employee's day, whether or not they have started it. */
  static async getState(employeeId: string, now = new Date()): Promise<SessionState> {
    const date = dayKey(now);
    const shift = await shiftForDay(employeeId, date);

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
      include: { sessions: { orderBy: { startedAt: 'asc' } } },
    });

    const sessions = attendance?.sessions ?? [];
    const open = sessions.find((s) => !s.endedAt);
    const totals = summariseDay(
      sessions.map((s) => ({
        kind: s.kind === SessionKind.BREAK ? 'BREAK' : 'WORK',
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      })),
      shift.scheduledHours,
      now,
      shiftStartOn(date, shift.startTime)
    );

    // The most recent segment the sweeper cut short and nobody has explained.
    const timedOut = [...sessions]
      .reverse()
      .find((s) => s.endedBy === SessionEnd.TIMEOUT && !s.reason);

    return {
      attendanceId: attendance?.id ?? null,
      date: date.toISOString(),
      running: open ? open.kind : null,
      startedAt: open ? open.startedAt.toISOString() : null,
      workedHours: totals.workedHours,
      breakHours: totals.breakHours,
      scheduledHours: shift.scheduledHours,
      breakAllowanceMinutes: shift.breakMinutes,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      isWorkingDay: shift.isWorkingDay,
      status: totals.status,
      wasLate: totals.wasLate,
      unexplained: timedOut?.endedAt
        ? {
            id: timedOut.id,
            endedAt: timedOut.endedAt.toISOString(),
            minutesLost: Math.round((now.getTime() - timedOut.endedAt.getTime()) / 60_000),
          }
        : null,
      segments: sessions.map((s) => ({
        id: s.id,
        kind: s.kind,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        endedBy: s.endedBy,
        reason: s.reason,
      })),
    };
  }

  /**
   * Starts the day, or picks the existing one back up.
   *
   * Deliberately idempotent: two browser tabs, or a phone alongside a laptop,
   * must share one running segment rather than each opening their own and
   * double-counting the morning.
   */
  static async checkIn(employeeId: string, now = new Date()): Promise<SessionState> {
    const date = dayKey(now);

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: {
        employeeId,
        date,
        checkIn: clock(now),
        checkOut: '',
        workedHours: 0,
        status: AttendanceStatus.ABSENT,
      },
      update: {},
      include: { sessions: true },
    });

    const open = attendance.sessions.find((s) => !s.endedAt);
    if (open) {
      // Already running somewhere. A break is resumed rather than refused, so
      // "check in" from a second tab does the obvious thing.
      if (open.kind === SessionKind.BREAK) return this.resume(employeeId, now);
      return this.getState(employeeId, now);
    }

    await prisma.attendanceSession.create({
      data: {
        attendanceId: attendance.id,
        kind: SessionKind.WORK,
        startedAt: now,
        lastHeartbeatAt: now,
      },
    });

    await this.recomputeDay(attendance.id, now);
    emitEvent(SocketEvents.ATTENDANCE_UPDATED, { employeeId, running: 'WORK' });
    return this.getState(employeeId, now);
  }

  /** Closes the working segment and opens a break. */
  static async pause(employeeId: string, now = new Date()): Promise<SessionState> {
    const open = await this.openSegment(employeeId, now);
    if (!open) throw new ValidationError('You are not checked in, so there is nothing to pause.');
    if (open.kind === SessionKind.BREAK) return this.getState(employeeId, now);

    await prisma.$transaction([
      prisma.attendanceSession.update({
        where: { id: open.id },
        data: { endedAt: now, endedBy: SessionEnd.USER },
      }),
      prisma.attendanceSession.create({
        data: {
          attendanceId: open.attendanceId,
          kind: SessionKind.BREAK,
          startedAt: now,
          lastHeartbeatAt: now,
        },
      }),
    ]);

    await this.recomputeDay(open.attendanceId, now);
    emitEvent(SocketEvents.ATTENDANCE_UPDATED, { employeeId, running: 'BREAK' });
    return this.getState(employeeId, now);
  }

  /** Closes the break and starts working again. */
  static async resume(employeeId: string, now = new Date()): Promise<SessionState> {
    const open = await this.openSegment(employeeId, now);
    if (!open) throw new ValidationError('You are not on a break.');
    if (open.kind === SessionKind.WORK) return this.getState(employeeId, now);

    await prisma.$transaction([
      prisma.attendanceSession.update({
        where: { id: open.id },
        data: { endedAt: now, endedBy: SessionEnd.USER },
      }),
      prisma.attendanceSession.create({
        data: {
          attendanceId: open.attendanceId,
          kind: SessionKind.WORK,
          startedAt: now,
          lastHeartbeatAt: now,
        },
      }),
    ]);

    await this.recomputeDay(open.attendanceId, now);
    emitEvent(SocketEvents.ATTENDANCE_UPDATED, { employeeId, running: 'WORK' });
    return this.getState(employeeId, now);
  }

  /**
   * Ends the day.
   *
   * `SIGN_OUT` rather than `USER` when it was signing out that stopped the
   * clock, so the timeline shows why the day ended.
   */
  static async stop(
    employeeId: string,
    endedBy: SessionEnd = SessionEnd.USER,
    now = new Date()
  ): Promise<SessionState> {
    const open = await this.openSegment(employeeId, now);
    if (!open) return this.getState(employeeId, now);

    await prisma.attendanceSession.update({
      where: { id: open.id },
      data: { endedAt: now, endedBy },
    });

    await this.recomputeDay(open.attendanceId, now);
    emitEvent(SocketEvents.ATTENDANCE_UPDATED, { employeeId, running: null });
    return this.getState(employeeId, now);
  }

  /**
   * Still here.
   *
   * The only thing that keeps a segment alive. Silence for longer than the
   * timeout hands the segment to the sweeper, which closes it at the last
   * heartbeat — so a closed laptop is never credited as work.
   */
  static async heartbeat(employeeId: string, now = new Date()): Promise<SessionState> {
    const open = await this.openSegment(employeeId, now);
    if (open) {
      await prisma.attendanceSession.update({
        where: { id: open.id },
        data: { lastHeartbeatAt: now },
      });
    }
    return this.getState(employeeId, now);
  }

  /**
   * Explains a segment the sweeper cut short.
   *
   * Only the person whose day it was may answer, and only once — the reason is
   * a record of what happened, not something to be revised later.
   */
  static async explain(
    employeeId: string,
    sessionId: string,
    reason: string
  ): Promise<SessionState> {
    const text = reason.trim();
    if (text.length < 3) throw new ValidationError('Give a short reason for the missing time.');

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { attendance: { select: { employeeId: true } } },
    });
    if (!session) throw new NotFoundError('Session');
    if (session.attendance.employeeId !== employeeId) {
      throw new ForbiddenError('You can only explain your own attendance.');
    }
    if (session.endedBy !== SessionEnd.TIMEOUT) {
      throw new ValidationError('That session did not time out, so it needs no explanation.');
    }
    if (session.reason) throw new ConflictError('That session has already been explained.');

    await prisma.attendanceSession.update({ where: { id: sessionId }, data: { reason: text } });
    return this.getState(employeeId);
  }

  /** What ending the day right now would record — shown before signing out. */
  static async previewStop(employeeId: string, now = new Date()) {
    const state = await this.getState(employeeId, now);
    return {
      workedHours: state.workedHours,
      workedLabel: formatHours(state.workedHours),
      breakLabel: formatHours(state.breakHours),
      scheduledHours: state.scheduledHours,
      status: state.status,
      /** Anything short of a full day is worth stopping the user over. */
      warn: state.isWorkingDay && state.status !== AttendanceStatus.PRESENT,
      running: state.running,
    };
  }

  private static async openSegment(employeeId: string, now: Date) {
    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: dayKey(now) } },
      select: { id: true, sessions: { where: { endedAt: null }, orderBy: { startedAt: 'asc' } } },
    });
    return attendance?.sessions[0] ?? null;
  }

  /**
   * Closes segments whose browser stopped reporting.
   *
   * Each is closed at its own last heartbeat rather than at the moment the
   * sweep runs, so the gap between going quiet and being noticed is never paid.
   * Returning inside the timeout finds the segment still open and simply
   * carries on, which is the margin the design promises.
   */
  static async sweepStaleSessions(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - HEARTBEAT_TIMEOUT_MINUTES * 60_000);

    const stale = await prisma.attendanceSession.findMany({
      where: { endedAt: null, lastHeartbeatAt: { lt: cutoff } },
      select: { id: true, attendanceId: true, lastHeartbeatAt: true },
    });
    if (stale.length === 0) return 0;

    for (const s of stale) {
      await prisma.attendanceSession.update({
        where: { id: s.id },
        data: { endedAt: s.lastHeartbeatAt, endedBy: SessionEnd.TIMEOUT },
      });
    }

    for (const attendanceId of new Set(stale.map((s) => s.attendanceId))) {
      await this.recomputeDay(attendanceId, now);
    }

    console.log(`[Attendance] closed ${stale.length} stale session(s) at their last heartbeat`);
    emitEvent(SocketEvents.ATTENDANCE_UPDATED, { swept: stale.length });
    return stale.length;
  }

  /**
   * Marks a working day nobody attended as absent.
   *
   * Payroll credits a full month when an employee has no attendance rows at
   * all, so a half-tracked month would otherwise pay only the logged days. A
   * row per missed working day keeps the count honest in both directions.
   *
   * Only ever writes rows in the past, and never touches a day that already has
   * one, so it cannot overwrite anything a person did or HR corrected.
   */
  static async markAbsentees(forDate: Date): Promise<number> {
    const date = dayKey(forDate);

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (employees.length === 0) return 0;

    const existing = await prisma.attendance.findMany({
      where: { date, employeeId: { in: employees.map((e) => e.id) } },
      select: { employeeId: true },
    });
    const covered = new Set(existing.map((a) => a.employeeId));

    const missing: string[] = [];
    for (const e of employees) {
      if (covered.has(e.id)) continue;
      const shift = await shiftForDay(e.id, date);
      // A weekend or a day off is not an absence.
      if (shift.isWorkingDay) missing.push(e.id);
    }
    if (missing.length === 0) return 0;

    await prisma.attendance.createMany({
      data: missing.map((employeeId) => ({
        employeeId,
        date,
        checkIn: '',
        checkOut: '',
        workedHours: 0,
        overtimeHours: 0,
        status: AttendanceStatus.ABSENT,
        notes: 'No attendance recorded for this working day.',
      })),
      skipDuplicates: true,
    });

    console.log(
      `[Attendance] marked ${missing.length} employee(s) absent for ${date.toISOString().slice(0, 10)}`
    );
    return missing.length;
  }

  /** Everyone with the clock running, for the live board on the dashboard. */
  static async whoIsWorking(now = new Date()) {
    const sessions = await prisma.attendanceSession.findMany({
      where: { endedAt: null, attendance: { date: dayKey(now) } },
      select: {
        kind: true,
        startedAt: true,
        attendance: {
          select: {
            employee: {
              select: { id: true, name: true, employeeCode: true, jobPosition: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    return sessions.map((s) => ({
      employee: s.attendance.employee,
      kind: s.kind,
      since: s.startedAt.toISOString(),
      minutes: Math.round((now.getTime() - s.startedAt.getTime()) / 60_000),
    }));
  }
}
