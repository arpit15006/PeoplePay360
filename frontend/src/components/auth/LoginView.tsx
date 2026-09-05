import Login from '@/components/shadcn-studio/blocks/login-page-04/login-page-04';

/**
 * Screen 1 — Login route. Renders the Shadcn Studio login-page-04 block
 * verbatim, outside <AppLayout>.
 *
 * NOTE: the block's form is presentational only (its onSubmit just calls
 * preventDefault), so signing in is currently a no-op. The working auth layer
 * is still in place and unused — see context/AuthContext.tsx (login/logout/me),
 * api/auth.ts and the backend at POST /api/auth/login — ready to be wired back
 * into the block's form when you want real authentication again.
 */
export function LoginView() {
  return <Login />;
}

export default LoginView;
