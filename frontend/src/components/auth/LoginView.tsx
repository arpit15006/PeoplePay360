import { Navigate } from 'react-router-dom';

import Login from '@/components/shadcn-studio/blocks/login-page-04/login-page-04';
import { useAuth } from '@/context/AuthContext';
import { roleLandingPath } from '@/types/user';

/**
 * Screen 1 — Login route. Renders the login-page-04 block full-screen, outside
 * <AppLayout>. The block's form authenticates through useAuth() -> POST
 * /api/auth/login and navigates on success.
 */
export function LoginView() {
  const { user, isBootstrapping } = useAuth();

  // Wait for the cookie session probe before deciding what to render.
  if (isBootstrapping) return null;

  // Already signed in — skip the login screen.
  if (user) return <Navigate to={roleLandingPath(user)} replace />;

  return <Login />;
}

export default LoginView;
