import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

/**
 * Shown for any address the router does not know.
 *
 * A signed-in user is offered the way back into the application; a visitor is
 * offered the home page. Neither is redirected automatically — silently moving
 * somebody somewhere else hides the fact that the link was wrong.
 */
export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="state state--empty">
      <h1 className="state__title">Page not found</h1>
      <p>This address does not exist, or the item behind it is no longer available.</p>
      <div className="state__actions">
        {isAuthenticated ? (
          <Link className="btn-link" to="/app/workspaces">
            Back to your workspaces
          </Link>
        ) : (
          <Link className="btn-link" to="/">
            Back to the home page
          </Link>
        )}
      </div>
    </section>
  );
}
