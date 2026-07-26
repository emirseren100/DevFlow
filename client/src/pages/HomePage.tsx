import { Link } from 'react-router-dom';

import HealthStatus from '../components/HealthStatus';
import { useAuth } from '../auth/AuthProvider';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="stack">
      <div>
        <h1>DevFlow</h1>
        <p className="home__lead">Issue and sprint management for small software teams.</p>
      </div>

      <ul className="home__points">
        <li>Workspaces with owner, admin and member roles.</li>
        <li>Projects, sprints and issues with per-project issue keys.</li>
        <li>A Kanban board, comments and an activity trail for every change.</li>
      </ul>

      <div className="page-header__actions">
        {isAuthenticated ? (
          <Link to="/app" className="btn-link">
            Open the app
          </Link>
        ) : (
          <>
            <Link to="/login" className="btn-link">
              Sign in
            </Link>
            <Link to="/register" className="btn-link btn-link--secondary">
              Create an account
            </Link>
          </>
        )}
      </div>

      <HealthStatus />
    </section>
  );
}
