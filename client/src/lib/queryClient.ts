import { QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from './apiClient';

/**
 * The single QueryClient of the application.
 *
 * The defaults are deliberately quiet:
 *
 * - no automatic retry. A 401, 403 or 404 will never succeed on a second try,
 *   and repeating a failed request only hides the problem; every error state in
 *   the UI offers a visible "Try again" button instead.
 * - no refetch on window focus, so switching tabs does not fire a burst of
 *   requests.
 * - `staleTime` of 30 seconds, so moving between pages reuses fresh data
 *   instead of refetching the same workspace list on every navigation. Data is
 *   still refreshed after a mutation, which is what actually changes it.
 *
 * `onUnauthenticated` runs when any query is refused with 401: the session
 * expired, so the authentication layer clears the stale user and the route
 * guard sends the browser to the login page. The login page is outside the
 * guard, so this cannot loop.
 */
export function createQueryClient(onUnauthenticated: () => void): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          onUnauthenticated();
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
}
