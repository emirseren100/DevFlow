import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

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
      <h1>Workspace</h1>
      <p>Signed in as {user?.name}</p>
      <p>{user?.email}</p>

      <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? 'Signing out…' : 'Sign out'}
      </button>

      <p>Workspaces, projects and issues arrive in Phases 4-6.</p>
    </section>
  );
}
