import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

/**
 * Layout for everything behind /app. It only shows who is signed in; the
 * workspace pages below decide what is on screen.
 */
export default function AppPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <section>
      <header>
        <p>Signed in as {user?.name}</p>
        <p>{user?.email}</p>

        <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      <Outlet />
    </section>
  );
}
