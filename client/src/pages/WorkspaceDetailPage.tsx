import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { RoleBadge } from '../components/badges';
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

      <PageHeader
        title={workspace.name}
        description="Workspace settings. Membership is managed on its own page."
      />

      <dl className="panel meta-grid">
        <div>
          <dt>Your role</dt>
          <dd>
            <RoleBadge role={workspace.role} />
          </dd>
        </div>
        <div>
          <dt>Slug</dt>
          <dd>{workspace.slug}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>
            {workspace.owner.name} ({workspace.owner.email})
          </dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>
            {workspace.memberCount} — <Link to={`/app/workspaces/${workspaceId}/members`}>Manage members</Link>
          </dd>
        </div>
      </dl>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {canManage ? (
        <form className="panel form" onSubmit={handleRename}>
          <h2>Rename workspace</h2>

          <div className="field">
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
          </div>

          <div className="form__row">
            <button type="submit" disabled={isBusy}>
              Save name
            </button>
          </div>
        </form>
      ) : (
        <PermissionNotice>Only an owner or an admin can rename this workspace.</PermissionNotice>
      )}

      {canDeleteWorkspace(workspace.role) && (
        <section className="panel panel--danger stack--tight">
          <h2>Danger zone</h2>
          <p className="muted">
            Deleting a workspace removes its memberships, projects, issues and comments. There is
            no undo.
          </p>

          <div className="record__actions">
            <button
              type="button"
              className="btn--danger"
              onClick={() => setIsConfirmingDelete(true)}
            >
              Delete workspace
            </button>
          </div>

          {isConfirmingDelete && (
            <ConfirmDialog
              title={`Delete ${workspace.name}?`}
              confirmLabel="Confirm delete"
              isBusy={isBusy}
              onCancel={() => setIsConfirmingDelete(false)}
              onConfirm={() => deleteMutation.mutate()}
            >
              Deleting this workspace also removes its memberships and cannot be undone.
            </ConfirmDialog>
          )}
        </section>
      )}
    </>
  );
}
