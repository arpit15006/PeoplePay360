import { getIO } from './index';

export const emitEvent = (event: string, data: any) => {
  try {
    const io = getIO();
    io.emit(event, data);
    console.log(`[WebSocket Broadcast] ${event}:`, data);
  } catch (err) {
    console.warn(`[WebSocket Broadcast Warning] Failed to emit ${event}:`, (err as Error).message);
  }
};

export const SocketEvents = {
  ATTENDANCE_UPDATED: 'attendance:updated',
  TIMEOFF_UPDATED: 'timeoff:updated',
  PAYRUN_STATUS_CHANGED: 'payrun:status_changed',
  /** One per payslip as a bulk send settles, so the screen can show real progress. */
  PAYSLIP_SEND_PROGRESS: 'payslip:send_progress',
  CONTRACT_UPDATED: 'contract:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
} as const;
