import { Navigate, Route, Routes } from 'react-router-dom';

import RequireAuth, { RedirectIfAuthenticated } from '../auth/RequireAuth';
import AppShell from '../layouts/AppShell';
import RootLayout from '../layouts/RootLayout';
import BoardPage from '../pages/BoardPage';
import DashboardPage from '../pages/DashboardPage';
import HomePage from '../pages/HomePage';
import IssueCreatePage from '../pages/IssueCreatePage';
import IssueDetailPage from '../pages/IssueDetailPage';
import LoginPage from '../pages/LoginPage';
import MembersPage from '../pages/MembersPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProjectActivityPage from '../pages/ProjectActivityPage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import ProjectListPage from '../pages/ProjectListPage';
import RegisterPage from '../pages/RegisterPage';
import WorkspaceDetailPage from '../pages/WorkspaceDetailPage';
import WorkspaceListPage from '../pages/WorkspaceListPage';

/**
 * Two layouts, not one.
 *
 * `RootLayout` is the public site: home, login, register. `AppShell` is the
 * signed-in application, with its own header, navigation and `<main>`. Keeping
 * them apart means the page never contains two `<main>` landmarks and no route
 * repeats the shell around itself.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />

        {/* Guests only: a signed-in user is sent straight to /app. */}
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Everything below needs a valid session. */}
      <Route element={<RequireAuth />}>
        <Route path="app" element={<AppShell />}>
          {/* No workspace is selected yet, so /app starts at the list. */}
          <Route index element={<Navigate to="/app/workspaces" replace />} />
          <Route path="workspaces" element={<WorkspaceListPage />} />

          {/* Selecting a workspace opens its overview. */}
          <Route
            path="workspaces/:workspaceId"
            element={<Navigate to="dashboard" replace />}
          />
          <Route path="workspaces/:workspaceId/dashboard" element={<DashboardPage />} />
          <Route path="workspaces/:workspaceId/members" element={<MembersPage />} />
          <Route path="workspaces/:workspaceId/settings" element={<WorkspaceDetailPage />} />

          <Route path="workspaces/:workspaceId/projects" element={<ProjectListPage />} />
          <Route
            path="workspaces/:workspaceId/projects/:projectId"
            element={<ProjectDetailPage />}
          />
          <Route
            path="workspaces/:workspaceId/projects/:projectId/board"
            element={<BoardPage />}
          />
          <Route
            path="workspaces/:workspaceId/projects/:projectId/activity"
            element={<ProjectActivityPage />}
          />
          {/* "new" comes before ":issueId" so it is never read as an id. */}
          <Route
            path="workspaces/:workspaceId/projects/:projectId/issues/new"
            element={<IssueCreatePage />}
          />
          <Route
            path="workspaces/:workspaceId/projects/:projectId/issues/:issueId"
            element={<IssueDetailPage />}
          />

          {/* An unknown address inside the application keeps the shell. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route element={<RootLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
