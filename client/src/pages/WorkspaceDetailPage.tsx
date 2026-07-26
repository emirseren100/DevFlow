import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../lib/apiClient';
import type { AssignableRole, WorkspaceDetail, WorkspaceMember } from '../lib/workspaceApi';
import {
  addMember,
  assignableRoles,
  canDeleteWorkspace,
  canManageWorkspace,
  canRemoveMember,
  deleteWorkspace,
  getWorkspace,
  listMembers,
  removeMember,
  renameWorkspace,
  updateMemberRole,
} from '../lib/workspaceApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export default function WorkspaceDetailPage() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<AssignableRole>('MEMBER');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Both requests belong to the same screen, so they are sent together instead
  // of one after the other.
  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError(null);

    Promise.all([getWorkspace(workspaceId), listMembers(workspaceId)])
      .then(([detail, memberList]) => {
        if (!active) return;

        setWorkspace(detail);
        setName(detail.name);
        setMembers(memberList);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageOf(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  /** Every mutating action shares the same busy flag and error slot. */
  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    setActionError(null);

    try {
      await action();
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();

    await run(async () => {
      const updated = await renameWorkspace(workspaceId, name);
      setWorkspace(updated);
    });
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();

    await run(async () => {
      const created = await addMember(workspaceId, memberEmail, memberRole);
      setMembers((current) => [...current, created]);
      setMemberEmail('');
    });
  }

  async function handleRoleChange(member: WorkspaceMember, role: AssignableRole) {
    await run(async () => {
      const updated = await updateMemberRole(workspaceId, member.id, role);
      setMembers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    });
  }

  async function handleRemoveMember(member: WorkspaceMember) {
    await run(async () => {
      await removeMember(workspaceId, member.id);
      setMembers((current) => current.filter((entry) => entry.id !== member.id));
    });
  }

  async function handleDeleteWorkspace() {
    await run(async () => {
      await deleteWorkspace(workspaceId);
      navigate('/app/workspaces', { replace: true });
    });
  }

  if (isLoading) {
    return <p role="status">Loading workspace…</p>;
  }

  if (loadError || !workspace) {
    return <p role="alert">{loadError ?? 'Workspace not found.'}</p>;
  }

  const canManage = canManageWorkspace(workspace.role);

  return (
    <section>
      <h1>{workspace.name}</h1>
      <p>Slug: {workspace.slug}</p>
      <p>Your role: {workspace.role}</p>
      <p>
        Owner: {workspace.owner.name} ({workspace.owner.email})
      </p>
      <p>
        <Link to={`/app/workspaces/${workspaceId}/projects`}>Projects</Link>
      </p>

      {actionError && <p role="alert">{actionError}</p>}

      {canManage && (
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
      )}

      <h2>Members</h2>

      <ul>
        {members.map((member) => (
          <li key={member.id}>
            <span>
              {member.name} ({member.email}) — {member.role}
            </span>

            {/* Only the owner may change roles, and never the owner's own. */}
            {workspace.role === 'OWNER' && member.role !== 'OWNER' && (
              <>
                <label htmlFor={`role-${member.id}`}>Role for {member.name}</label>
                <select
                  id={`role-${member.id}`}
                  value={member.role}
                  disabled={isBusy}
                  onChange={(event) =>
                    handleRoleChange(member, event.target.value as AssignableRole)
                  }
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </>
            )}

            {canRemoveMember(workspace.role, member.role) && (
              <button type="button" disabled={isBusy} onClick={() => handleRemoveMember(member)}>
                Remove {member.name}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <form onSubmit={handleAddMember}>
          <h2>Add a member</h2>
          <p>Only people who already have a DevFlow account can be added.</p>

          <label htmlFor="member-email">Member email</label>
          <input
            id="member-email"
            name="email"
            type="email"
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            required
          />

          <label htmlFor="member-role">Member role</label>
          <select
            id="member-role"
            value={memberRole}
            onChange={(event) => setMemberRole(event.target.value as AssignableRole)}
          >
            {assignableRoles(workspace.role).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button type="submit" disabled={isBusy}>
            Add member
          </button>
        </form>
      )}

      {canDeleteWorkspace(workspace.role) && (
        <div>
          <h2>Danger zone</h2>

          {isConfirmingDelete ? (
            <>
              <p role="alert">
                Deleting this workspace also removes its memberships and cannot be undone.
              </p>
              <button type="button" disabled={isBusy} onClick={handleDeleteWorkspace}>
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
    </section>
  );
}
