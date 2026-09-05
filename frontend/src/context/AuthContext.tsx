import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef} from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { AuthUser } from '@/types/user';

interface AuthContextValue {
  user: AuthUser | null;
  /** True only while the initial session probe is in flight. */
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  /**
   * Drop every cached query the moment the signed-in person changes.
   *
   * Clearing inside login and logout is not enough. The auth cookie belongs to
   * the browser, not to a tab, so signing in as someone else in one tab changes
   * who the cookie identifies for every open tab; a tab still holding the
   * previous user's rows then renders them under the new person's name. The
   * same gap exists on the restore path below, which adopts whoever the cookie
   * identifies without touching the cache.
   *
   * Watching the identity itself covers all of those at once, and clearing an
   * already-empty cache costs nothing.
   */
  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    if (lastUserId.current === id) return;
    lastUserId.current = id;

    // resetQueries alone, deliberately. clear() removes the query objects
    // outright, which leaves an already-mounted screen rendering the result it
    // last received and gives resetQueries nothing left to match — the previous
    // user's rows then stay on screen under the new user's name. resetQueries
    // discards each query's data and refetches the ones currently mounted, so
    // the view reloads as whoever is now signed in.
    void queryClient.resetQueries();
  }, [user?.id, queryClient]);

  // Restore the session from the httpOnly cookie on first mount.
  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then(({ user: me }) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Notice when the signed-in person changes underneath an open tab.
   *
   * The auth cookie belongs to the browser, not to a tab. Signing in as someone
   * else in a second tab silently changes who the cookie identifies for every
   * tab already open; those tabs keep showing the previous user's name over
   * data the server would no longer return. Nothing in the page tells them.
   *
   * The session is re-read when the tab regains focus, and on a slow interval
   * as well: focus events are unreliable across browsers and do not fire at all
   * for a tab left visible on a second monitor. The request is tiny and only
   * runs while the tab is visible. The identity effect above does the rest.
   */
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      authApi
        .me()
        .then(({ user: me }) => setUser(current => (current?.id === me.id ? current : me)))
        .catch(() => setUser(null));
    };

    const timer = window.setInterval(recheck, 15_000);
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      // The server sets an httpOnly cookie; the token in the response body is
      // deliberately not persisted anywhere JavaScript can read it.
      const res = await authApi.login({ email, password });

      // Signing in and out are client-side transitions, so the page is never
      // reloaded and the query cache outlives the session that filled it.
      // Without this, the next person to sign in on the same tab is served the
      // previous user's rows from cache until the refetch lands — an employee
      // briefly seeing the whole company's contracts. Cleared on the way in as
      // well as out, because a session can end without anyone pressing Log out.
      queryClient.clear();

      setUser(res.user);
      return res.user;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      setUser(null);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, isBootstrapping, login, logout }),
    [user, isBootstrapping, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
