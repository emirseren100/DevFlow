import { Navigate, Route, Routes } from 'react-router-dom';

import RequireAuth, { RedirectIfAuthenticated } from '../auth/RequireAuth';
import RootLayout from '../layouts/RootLayout';
import AppPage from '../pages/AppPage';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import RegisterPage from '../pages/RegisterPage';
import WorkspaceDetailPage from '../pages/WorkspaceDetailPage';
import WorkspaceListPage from '../pages/WorkspaceListPage';

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

        {/* Everything below needs a valid session. */}
        <Route element={<RequireAuth />}>
          <Route path="app" element={<AppPage />}>
            {/* There is no dashboard yet, so /app starts at the workspaces. */}
            <Route index element={<Navigate to="/app/workspaces" replace />} />
            <Route path="workspaces" element={<WorkspaceListPage />} />
            <Route path="workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
