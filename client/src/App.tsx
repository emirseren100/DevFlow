import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from './auth/AuthProvider';
import { createQueryClient } from './lib/queryClient';
import AppRoutes from './router/AppRoutes';

/**
 * Creates the one QueryClient of the application.
 *
 * It lives in state, not in a module-level constant, so every mounted App owns
 * its own cache. In the browser that is exactly one; in tests it means one test
 * can never see data another test loaded.
 *
 * The client is created inside AuthProvider because it needs `clearUser`: a
 * query answered with 401 means the session is gone, and the authentication
 * layer — not the cache — is what owns that fact.
 */
function QueryProvider({ children }: { children: ReactNode }) {
  const { clearUser } = useAuth();
  const [queryClient] = useState(() => createQueryClient(clearUser));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// The router provider lives in main.tsx so tests can wrap App in their own router.
export default function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <AppRoutes />
      </QueryProvider>
    </AuthProvider>
  );
}
