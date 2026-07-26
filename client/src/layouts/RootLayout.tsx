import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

/**
 * The public frame: home, login and register.
 *
 * It shows the same wordmark and the same surfaces as the signed-in
 * application, so signing in changes what is on the page, not what the product
 * looks like. Which links appear depends on whether there is a session.
 */
export default function RootLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            DF
          </span>
          DevFlow
        </Link>

        <nav aria-label="Main navigation">
          {isAuthenticated ? (
            <NavLink
              to="/app"
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
            >
              Open the app
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
              >
                Register
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="layout__main">
        <Outlet />
      </main>

      <footer className="layout__footer">
        DevFlow — issue and sprint management for small software teams.
      </footer>
    </div>
  );
}
