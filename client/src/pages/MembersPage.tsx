import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { RoleBadge } from '../components/badges';
import { ErrorState, LoadingState, PermissionNotice } from '../components/states';
import { errorMessage } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import type { AssignableRole, WorkspaceMember } from '../lib/workspaceApi';
import {
  ROLE_LABELS,
  addMember,
  assignableRoles,
  canManageWorkspace,
  canRemoveMember,
  getWorkspace,
  listMembers,
  removeMember,
  updateMemberRole,
} from '../lib/workspaceApi';

/** The two roles the per-member selector may switch between. */
const ASSIGNABLE_ROLES: AssignableRole[] = ['MEMBER', 'ADMIN'];

/**
 * The only place where workspace membership is managed.
 *
 * The overview links here instead of repeating the same list, so there is one
 * form to keep correct and one set of rules to explain.
 */
export default function MembersPage() {
  const { workspaceId = '' } = useParams();
  const queryClient = useQueryClient();

  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<AssignableRole>('MEMBER');
  const [removingMember, setRemovingMember] = useState<WorkspaceMember | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const workspaceQuery = useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: ({ signal }) => getWorkspace(workspaceId, signal),
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: ({ signal }) => listMembers(workspaceId, signal),
  });

  /**
   * Membership changes the member list, the member count on the workspace and
   * the dashboard summary — and nothing else. Those three keys are invalidated,
   * not the whole cache.
   */
  function invalidateMembership() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(workspaceId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workspace(workspaceId),
      exact: true,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceList() });
  }

  const addMemberMutation = useMutation({
    mutationFn: (input: { email: string; role: AssignableRole }) =>
      addMember(workspaceId, input.email, input.role),
    onSuccess: () => {
      setMemberEmail('');
      setActionError(null);
      invalidateMembership();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { memberId: string; role: AssignableRole }) =>
      updateMemberRole(workspaceId, input.memberId, input.role),
    onSuccess: () => {
      setActionError(null);
      invalidateMembership();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      setActionError(null);
      invalidateMembership();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (workspaceQuery.isPending || membersQuery.isPending) {
    return <LoadingState label="Loading members…" />;
  }

  if (workspaceQuery.isError) {
    return (
      <ErrorState error={workspaceQuery.error} onRetry={() => void workspaceQuery.refetch()} />
    );
  }

  if (membersQuery.isError) {
    return <ErrorState error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />;
  }

  const workspace = workspaceQuery.data;
  const members = membersQuery.data;
  const canManage = canManageWorkspace(workspace.role);
  const isBusy =
    addMemberMutation.isPending || roleMutation.isPending || removeMutation.isPending;

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    addMemberMutation.mutate({ email: memberEmail, role: memberRole });
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: workspace.name, to: `/app/workspaces/${workspaceId}/dashboard` },
          { label: 'Members' },
        ]}
      />

      <PageHeader
        title="Members"
        description={`${workspace.memberCount} people can reach ${workspace.name}.`}
      />

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      <ul className="record-list panel">
        {members.map((member: WorkspaceMember) => (
          <li key={member.id}>
            <span className="record__title">
              {member.name} <RoleBadge role={member.role} />
            </span>
            <span className="record__meta">{member.email}</span>

            <div className="record__actions">
              {/* Only the owner may change roles, and never the owner's own. */}
              {workspace.role === 'OWNER' && member.role !== 'OWNER' && (
                <div className="field">
                  <label htmlFor={`role-${member.id}`}>Role for {member.name}</label>
                  <select
                    id={`role-${member.id}`}
                    value={member.role}
                    disabled={isBusy}
                    onChange={(event) =>
                      roleMutation.mutate({
                        memberId: member.id,
                        role: event.target.value as AssignableRole,
                      })
                    }
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Removing somebody ends their access at once, so it is asked
                  again in a dialog and never styled like an ordinary button. */}
              {canRemoveMember(workspace.role, member.role) && (
                <button
                  type="button"
                  className="btn--danger"
                  disabled={isBusy}
                  onClick={() => setRemovingMember(member)}
                >
                  Remove {member.name}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {removingMember && (
        <ConfirmDialog
          title={`Remove ${removingMember.name}?`}
          confirmLabel="Confirm removal"
          isBusy={isBusy}
          onCancel={() => setRemovingMember(null)}
          onConfirm={() => {
            removeMutation.mutate(removingMember.id);
            setRemovingMember(null);
          }}
        >
          {removingMember.name} loses access to {workspace.name} and everything inside it. Their
          issues and comments stay.
        </ConfirmDialog>
      )}

      {canManage ? (
        <form className="panel form" onSubmit={handleAdd}>
          <h2>Add a member</h2>
          <p className="muted">Only people who already have a DevFlow account can be added.</p>

          <div className="field">
            <label htmlFor="member-email">Member email</label>
            <input
              id="member-email"
              name="email"
              type="email"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="member-role">Member role</label>
            <select
              id="member-role"
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value as AssignableRole)}
            >
              {assignableRoles(workspace.role).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="form__row">
            <button type="submit" disabled={isBusy}>
              Add member
            </button>
          </div>
        </form>
      ) : (
        <PermissionNotice>
          Only an owner or an admin can add or remove members of this workspace.
        </PermissionNotice>
      )}
    </>
  );
}
