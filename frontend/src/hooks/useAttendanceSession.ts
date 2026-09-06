import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { attendanceSessionApi, type SessionState } from '@/api/attendanceSession';
import { useAuth } from '@/context/AuthContext';

/** How often to tell the server the browser is still here. */
const HEARTBEAT_MS = 60_000;
/** How often the on-screen clock ticks. Display only — the server keeps the time. */
const TICK_MS = 1_000;

/**
 * The signed-in employee's working day.
 *
 * The elapsed time shown here is never sent anywhere. The server records when
 * each stretch began and ended; this only adds the seconds since the running
 * one started so the number moves, and every action refetches the truth.
 */
export function useAttendanceSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // An account with no employee record has no timesheet to keep.
  const enabled = Boolean(user?.employeeId);

  const query = useQuery({
    queryKey: ['attendance', 'session'],
    queryFn: attendanceSessionApi.state,
    enabled,
    // The sweeper can close a session between actions, so this is never stale
    // for long even when the tab sits idle.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const state = query.data;
  const set = (next: SessionState) => queryClient.setQueryData(['attendance', 'session'], next);

  /** Every action also refreshes the lists and the dashboard that read attendance. */
  const invalidateDependents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['attendance'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const action = (fn: () => Promise<SessionState>) => ({
    mutationFn: fn,
    onSuccess: (next: SessionState) => {
      set(next);
      invalidateDependents();
    },
  });

  const checkIn = useMutation(action(attendanceSessionApi.checkIn));
  const pause = useMutation(action(attendanceSessionApi.pause));
  const resume = useMutation(action(attendanceSessionApi.resume));
  const stop = useMutation(action(attendanceSessionApi.stop));

  const explain = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      attendanceSessionApi.explain(sessionId, reason),
    onSuccess: (next) => {
      set(next);
      invalidateDependents();
    },
  });

  // Keep the running stretch alive. Silence for longer than the server's
  // timeout hands it to the sweeper, which closes it at the last beat.
  useEffect(() => {
    if (!enabled || !state?.running) return;
    const timer = setInterval(() => {
      void attendanceSessionApi
        .heartbeat()
        .then(({ alive }) => {
          // The sweeper can have closed the session while this tab sat idle.
          // Only then is a refetch worth a round trip.
          if (!alive) void query.refetch();
        })
        .catch(() => undefined);
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, state?.running]);

  // A local clock so the elapsed figure moves between refetches.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state?.running) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [state?.running]);

  /**
   * Seconds worked so far: what the server has already banked, plus the
   * stretch currently running. Only the running one is measured here, so a
   * clock skew can never inflate the recorded total.
   */
  const liveWorkedSeconds = (() => {
    if (!state) return 0;
    const banked = state.workedHours * 3600;
    if (state.running !== 'WORK' || !state.startedAt) return Math.round(banked);
    // workedHours already counts the open stretch as at the last fetch, so
    // measure from that moment rather than adding the whole stretch twice.
    const since = Math.max(0, (now - new Date(query.dataUpdatedAt).getTime()) / 1000);
    return Math.round(banked + since);
  })();

  const liveBreakSeconds = (() => {
    if (!state) return 0;
    const banked = state.breakHours * 3600;
    if (state.running !== 'BREAK') return Math.round(banked);
    const since = Math.max(0, (now - new Date(query.dataUpdatedAt).getTime()) / 1000);
    return Math.round(banked + since);
  })();

  return {
    state,
    enabled,
    isLoading: query.isLoading,
    isError: query.isError,
    liveWorkedSeconds,
    liveBreakSeconds,
    checkIn,
    pause,
    resume,
    stop,
    explain,
    refetch: query.refetch,
  };
}

/** "8h 57m" from seconds, matching how the server labels a finished day. */
export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds / 60));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
};

/** "07:42:15" for the running clock, where the seconds are the point. */
export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};
