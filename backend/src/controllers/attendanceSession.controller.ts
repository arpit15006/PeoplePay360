import { NextFunction, Request, Response } from 'express';
import { SessionEnd } from '@prisma/client';

import { AttendanceSessionService } from '../services/attendanceSession.service';
import { ForbiddenError } from '../utils/errors';

/**
 * The employee's own working session.
 *
 * Every route acts on the caller's own employee record — there is no id in the
 * path — so one person can never start or stop another's day.
 */

function ownEmployeeId(req: Request): string {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    throw new ForbiddenError(
      'This account is not linked to an employee record, so it cannot record attendance.'
    );
  }
  return employeeId;
}

const handler =
  (run: (employeeId: string, req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await run(ownEmployeeId(req), req) });
    } catch (err) {
      next(err);
    }
  };

export const getMySession = handler((id) => AttendanceSessionService.getState(id));
export const checkIn = handler((id) => AttendanceSessionService.checkIn(id));
export const pause = handler((id) => AttendanceSessionService.pause(id));
export const resume = handler((id) => AttendanceSessionService.resume(id));
export const stop = handler((id) => AttendanceSessionService.stop(id, SessionEnd.USER));
/**
 * Says only whether a session is still running. The screen keeps its own copy
 * of the day and refetches on action, so returning the whole state here would
 * be a second query per minute per employee for nothing.
 */
export const heartbeat = handler((id) => AttendanceSessionService.heartbeat(id));
export const previewStop = handler((id) => AttendanceSessionService.previewStop(id));

export const explain = handler((id, req) =>
  AttendanceSessionService.explain(id, req.body?.sessionId, req.body?.reason ?? '')
);

/** The live board. Readable by anyone who can already see the team's attendance. */
export async function whoIsWorking(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({ success: true, data: await AttendanceSessionService.whoIsWorking() });
  } catch (err) {
    next(err);
  }
}
