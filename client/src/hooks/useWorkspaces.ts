import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { queryKeys } from '../lib/queryKeys';
import type { WorkspaceSummary } from '../lib/workspaceApi';
import { listWorkspaces } from '../lib/workspaceApi';

/**
 * The workspaces the signed-in user belongs to.
 *
 * Every nested page can call this: TanStack Query answers the second and third
 * caller from the cache under the same key, so the list is fetched once and not
 * once per component.
 */
export function useWorkspacesQuery() {
  return useQuery({
    queryKey: queryKeys.workspaceList(),
    queryFn: ({ signal }) => listWorkspaces(signal),
  });
}

/**
 * The workspace id in the current URL, or `null` outside a workspace.
 *
 * Read from the path rather than from `useParams`, because the shell sits above
 * the route that actually declares `:workspaceId`.
 */
export function useCurrentWorkspaceId(): string | null {
  const { pathname } = useLocation();
  const match = /^\/app\/workspaces\/([^/]+)/.exec(pathname);

  return match?.[1] ?? null;
}

/**
 * The current workspace as it appears in the user's own list.
 *
 * Undefined means "not in the list": either the page is outside a workspace, or
 * the id in the URL is one this user cannot reach. Either way the shell shows
 * no workspace context — and the server still refuses the data itself.
 */
export function useCurrentWorkspace(): WorkspaceSummary | undefined {
  const workspaceId = useCurrentWorkspaceId();
  const { data } = useWorkspacesQuery();

  if (!workspaceId) {
    return undefined;
  }

  return data?.find((workspace) => workspace.id === workspaceId);
}
