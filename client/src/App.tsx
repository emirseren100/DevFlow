import { AuthProvider } from './auth/AuthProvider';
import AppRoutes from './router/AppRoutes';

// The router provider lives in main.tsx so tests can wrap App in their own router.
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
