import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import { ErrorState, LoadingState, PermissionNotice } from '../components/states';
import { errorMessage } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import {
  canDeleteWorkspace,
  canManageWorkspace,
  deleteWorkspace,
  getWorkspace,
  renameWorkspace,
} from '../lib/workspaceApi';

/**
 * Workspace settings: the name and the destructive actions.
 *
 * Membership lives on its own page, so this screen only links to it instead of
 * repeating the member list.
 */
export default function WorkspaceDetailPage() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const workspaceQuery = useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: ({ signal }) => getWorkspace(workspaceId, signal),
  });

  // The form starts from the server value and is only reset when the workspace
  // itself changes, so a half-typed name is not overwritten by a refetch.
  const loadedName = workspaceQuery.data?.name;

  useEffect(() => {
    if (loadedName !== undefined) {
      setName(loadedName);
    }
  }, [loadedName, workspaceId]);

  const renameMutation = useMutation({
    mutationFn: (nextName: string) => renameWorkspace(workspaceId, nextName),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace(workspaceId),
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceList() });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: () => {
      // The workspace and everything cached below it are gone for good.
      queryClient.removeQueries({ queryKey: queryKeys.workspace(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceList() });
      navigate('/app/workspaces', { replace: true });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (workspaceQuery.isPending) {
    return <LoadingState label="Loading workspace…" />;
  }

  if (workspaceQuery.isError) {
    return (
      <ErrorState error={workspaceQuery.error} onRetry={() => void workspaceQuery.refetch()} />
    );
  }

  const workspace = workspaceQuery.data;
  const canManage = canManageWorkspace(workspace.role);
  const isBusy = renameMutation.isPending || deleteMutation.isPending;

  function handleRename(event: FormEvent) {
    event.preventDefault();
    renameMutation.mutate(name);
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: workspace.name, to: `/app/workspaces/${workspaceId}/dashboard` },
          { label: 'Settings' },
        ]}
      />

      <PageHeader title={workspace.name} description={`Your role: ${workspace.role}`} />

      <p>Slug: {workspace.slug}</p>
      <p>
        Owner: {workspace.owner.name} ({workspace.owner.email})
      </p>
      <p>
        {workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'} —{' '}
        <Link to={`/app/workspaces/${workspaceId}/members`}>Manage members</Link>
      </p>

      {actionError && <p role="alert">{actionError}</p>}

      {canManage ? (
        <form onSubmit={handleRename}>
          <h2>Rename workspace</h2>

          <label htmlFor="workspace-name">Workspace name</label>
          <input
            id="workspace-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={80}
          />

          <button type="submit" disabled={isBusy}>
            Save name
          </button>
        </form>
      ) : (
        <PermissionNotice>Only an owner or an admin can rename this workspace.</PermissionNotice>
      )}

      {canDeleteWorkspace(workspace.role) && (
        <div>
          <h2>Danger zone</h2>

          {isConfirmingDelete ? (
            <>
              <p role="alert">
                Deleting this workspace also removes its memberships and cannot be undone.
              </p>
              <button type="button" disabled={isBusy} onClick={() => deleteMutation.mutate()}>
                Confirm delete
              </button>
              <button type="button" onClick={() => setIsConfirmingDelete(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsConfirmingDelete(true)}>
              Delete workspace
            </button>
          )}
        </div>
      )}
    </>
  );
}
