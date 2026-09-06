import { api } from './client';
import type { AttendanceStatus } from '@/types/attendance';

interface Env<T> {
  success: boolean;
  data: T;
}

export type SessionKind = 'WORK' | 'BREAK';
export type SessionEnd = 'USER' | 'SIGN_OUT' | 'TIMEOUT' | 'MIDNIGHT';

export interface SessionSegment {
  id: string;
  kind: SessionKind;
  startedAt: string;
  endedAt: string | null;
  endedBy: SessionEnd | null;
  reason: string | null;
}

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
  /** A stretch the server closed for silence, still waiting to be explained. */
  unexplained: { id: string; endedAt: string; minutesLost: number } | null;
  segments: SessionSegment[];
}

export interface StopPreview {
  workedHours: number;
  workedLabel: string;
  breakLabel: string;
  scheduledHours: number;
  status: AttendanceStatus;
  /** True when ending now would record something short of a full day. */
  warn: boolean;
  running: SessionKind | null;
}

export interface WorkingNow {
  employee: { id: string; name: string; employeeCode: string; jobPosition: string };
  kind: SessionKind;
  since: string;
  minutes: number;
}

const unwrap = <T>(r: Env<T>): T => r.data;

export const attendanceSessionApi = {
  state: () => api.get<Env<SessionState>>('/attendance/session').then(unwrap),
  previewStop: () => api.get<Env<StopPreview>>('/attendance/session/preview-stop').then(unwrap),
  checkIn: () => api.post<Env<SessionState>>('/attendance/session/check-in').then(unwrap),
  pause: () => api.post<Env<SessionState>>('/attendance/session/pause').then(unwrap),
  resume: () => api.post<Env<SessionState>>('/attendance/session/resume').then(unwrap),
  stop: () => api.post<Env<SessionState>>('/attendance/session/stop').then(unwrap),
  /** Returns only whether a session is still running — see the service for why. */
  heartbeat: () => api.post<Env<{ alive: boolean }>>('/attendance/session/heartbeat').then(unwrap),
  explain: (sessionId: string, reason: string) =>
    api.post<Env<SessionState>>('/attendance/session/explain', { sessionId, reason }).then(unwrap),
  whoIsWorking: () => api.get<Env<WorkingNow[]>>('/attendance/who-is-working').then(unwrap),
};
