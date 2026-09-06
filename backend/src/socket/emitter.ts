import { Role } from '@prisma/client';

import { getIO, ROOM_ALL, roomForEmployee, roomForRole, roomForUser } from './index';

/**
 * Who an event is for.
 *
 * Left out entirely, it goes to everyone signed in — which should be rare, and
 * deliberate. Every event below names its audience instead, so a check-in
 * reaches the person it happened to and the people whose job it is to watch,
 * rather than every open browser in the company.
 */
export interface Audience {
  employeeIds?: (string | null | undefined)[];
  userIds?: (string | null | undefined)[];
  roles?: Role[];
}

/** The roles whose screens show other people's attendance and leave. */
export const HR_AUDIENCE: Role[] = [
  Role.HR_MANAGER,
  Role.HR_PAYROLL_USER,
  Role.HR_PAYROLL_MANAGER,
  Role.ADMIN,
];

/** The roles that run payroll. */
export const PAYROLL_AUDIENCE: Role[] = [
  Role.HR_PAYROLL_USER,
  Role.HR_PAYROLL_MANAGER,
  Role.ADMIN,
];

export const emitEvent = (event: string, data: unknown, audience?: Audience) => {
  try {
    const io = getIO();

    if (!audience) {
      io.to(ROOM_ALL).emit(event, data);
      return;
    }

    const rooms = [
      ...(audience.employeeIds ?? []).filter(Boolean).map((id) => roomForEmployee(id as string)),
      ...(audience.userIds ?? []).filter(Boolean).map((id) => roomForUser(id as string)),
      ...(audience.roles ?? []).map(roomForRole),
    ];

    // No audience resolved to anything — sending to no rooms would broadcast,
    // so nothing is sent at all.
    if (rooms.length === 0) return;

    // Socket.IO delivers once per socket even when it is in several of these.
    io.to(rooms).emit(event, data);
  } catch (err) {
    console.warn(`[WebSocket Broadcast Warning] Failed to emit ${event}:`, (err as Error).message);
  }
};

export const SocketEvents = {
  ATTENDANCE_UPDATED: 'attendance:updated',
  TIMEOFF_UPDATED: 'timeoff:updated',
  PAYRUN_STATUS_CHANGED: 'payrun:status_changed',
  CONTRACT_UPDATED: 'contract:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  /** One per payslip as a bulk send settles, so the screen can show real progress. */
  PAYSLIP_SEND_PROGRESS: 'payslip:send_progress',
} as const;
