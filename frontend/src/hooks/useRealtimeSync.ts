import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { socket } from '@/socket';

/**
 * Keeps open screens current when someone else changes something.
 *
 * The server already broadcasts these events, but nothing on this side was
 * listening, so a leave approved by a manager or a payrun marked paid stayed
 * stale until the page was reloaded.
 *
 * Each event invalidates the queries it can affect rather than pushing the
 * payload into the cache directly. The socket carries whatever the emitting
 * service happened to include, which is not always shaped like the response the
 * screen reads, and refetching keeps one source of truth. Invalidation is cheap
 * because TanStack Query only refetches what is currently mounted.
 */
const EVENT_KEYS: Record<string, string[][]> = {
  'attendance:updated': [['attendance'], ['dashboard'], ['employee']],
  'timeoff:updated': [['timeoff'], ['dashboard'], ['employee']],
  'payrun:status_changed': [['payruns'], ['payslips'], ['dashboard']],
  'contract:updated': [['contracts'], ['employee'], ['dashboard']],
  'dashboard:refresh': [['dashboard']],
};

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handlers = Object.entries(EVENT_KEYS).map(([event, keys]) => {
      const handler = () => {
        for (const queryKey of keys) {
          queryClient.invalidateQueries({ queryKey });
        }
      };
      socket.on(event, handler);
      return [event, handler] as const;
    });

    // The app is usable without the socket, so a failed connection is noted and
    // otherwise ignored rather than surfaced to the user.
    const onError = (err: Error) => {
      console.warn('[WebSocket] not connected:', err.message);
    };
    socket.on('connect_error', onError);

    return () => {
      for (const [event, handler] of handlers) socket.off(event, handler);
      socket.off('connect_error', onError);
    };
  }, [queryClient]);
}

export default useRealtimeSync;
