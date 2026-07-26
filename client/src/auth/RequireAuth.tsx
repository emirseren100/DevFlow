import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider';

/**
 * Route guard. While the first /api/auth/me call is pending nothing is decided
 * yet, so the guard must wait instead of redirecting a logged-in user away.
 */
export default function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p role="status">Checking your session…</p>;
  }

  if (!isAuthenticated) {
    // `from` lets the login page send the user back where they wanted to go.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Mirror image: a signed-in user has no reason to see /login or /register. */
export function RedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p role="status">Checking your session…</p>;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
