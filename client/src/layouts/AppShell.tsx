import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import WorkspaceNavigation from '../components/WorkspaceNavigation';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';

/**
 * The frame every signed-in page is drawn inside.
 *
 * One header, one navigation area and one `<main>` for the whole authenticated
 * application, so no page repeats the brand, the workspace switcher or the sign
 * out button. Pages render only their own content into the outlet.
 *
 * On a narrow screen the navigation collapses behind a "Menu" button. The same
 * markup is used at every width — there is no second mobile layout to keep in
 * sync — and CSS decides whether the panel is always visible or toggled.
 */
export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Following a link on a phone should close the menu it was opened from.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  function closeMenu() {
    setIsMenuOpen(false);
    // Focus goes back to the control that opened the panel, so a keyboard user
    // is not dropped at the top of the document.
    menuButtonRef.current?.focus();
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link to="/app" className="app-shell__brand">
          DevFlow
        </Link>

        <button
          type="button"
          ref={menuButtonRef}
          className="app-shell__menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="app-shell-navigation"
          onClick={() => (isMenuOpen ? closeMenu() : setIsMenuOpen(true))}
        >
          {isMenuOpen ? 'Close menu' : 'Menu'}
        </button>

        <div className="app-shell__user">
          <span className="app-shell__user-name">{user?.name}</span>
          <span className="app-shell__user-email">{user?.email}</span>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <div className="app-shell__body">
        <div
          id="app-shell-navigation"
          className={
            isMenuOpen ? 'app-shell__nav app-shell__nav--open' : 'app-shell__nav'
          }
        >
          <WorkspaceSwitcher />
          <WorkspaceNavigation onNavigate={() => setIsMenuOpen(false)} />
        </div>

        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
