import { Route, Routes } from 'react-router-dom';

import RequireAuth, { RedirectIfAuthenticated } from '../auth/RequireAuth';
import RootLayout from '../layouts/RootLayout';
import AppPage from '../pages/AppPage';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import RegisterPage from '../pages/RegisterPage';

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
          <Route path="app" element={<AppPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
