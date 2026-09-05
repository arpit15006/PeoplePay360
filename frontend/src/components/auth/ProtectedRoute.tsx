import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Roles permitted to see this route. Omit to allow any authenticated user.
   * This mirrors — but does not replace — the server-side RBAC check.
   */
  allow?: Role[];
}

export function ProtectedRoute({ children, allow }: ProtectedRouteProps) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-2xl font-semibold">403 — Not authorised</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Your role ({user.role}) does not have access to this module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
