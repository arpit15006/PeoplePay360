import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
