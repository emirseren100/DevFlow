import { apiRequest, get } from './apiClient';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/** Role that may be handed to somebody else. OWNER is never one of them. */
export type AssignableRole = 'ADMIN' | 'MEMBER';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  owner: { id: string; name: string; email: string };
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export function listWorkspaces(signal?: AbortSignal): Promise<WorkspaceSummary[]> {
  return apiRequest<{ workspaces: WorkspaceSummary[] }>('/workspaces', get(signal)).then(
    (data) => data.workspaces,
  );
}

export function createWorkspace(name: string): Promise<WorkspaceDetail> {
  return apiRequest<{ workspace: WorkspaceDetail }>('/workspaces', {
    method: 'POST',
    body: { name },
  }).then((data) => data.workspace);
}

export function getWorkspace(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<WorkspaceDetail> {
  return apiRequest<{ workspace: WorkspaceDetail }>(`/workspaces/${workspaceId}`, get(signal)).then(
    (data) => data.workspace,
  );
}

export function renameWorkspace(workspaceId: string, name: string): Promise<WorkspaceDetail> {
  return apiRequest<{ workspace: WorkspaceDetail }>(`/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: { name },
  }).then((data) => data.workspace);
}

export function deleteWorkspace(workspaceId: string): Promise<void> {
  return apiRequest(`/workspaces/${workspaceId}`, { method: 'DELETE' }).then(() => undefined);
}

export function listMembers(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<WorkspaceMember[]> {
  return apiRequest<{ members: WorkspaceMember[] }>(
    `/workspaces/${workspaceId}/members`,
    get(signal),
  ).then((data) => data.members);
}

export function addMember(
  workspaceId: string,
  email: string,
  role: AssignableRole,
): Promise<WorkspaceMember> {
  return apiRequest<{ member: WorkspaceMember }>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: { email, role },
  }).then((data) => data.member);
}

export function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: AssignableRole,
): Promise<WorkspaceMember> {
  return apiRequest<{ member: WorkspaceMember }>(
    `/workspaces/${workspaceId}/members/${memberId}`,
    { method: 'PATCH', body: { role } },
  ).then((data) => data.member);
}

export function removeMember(workspaceId: string, memberId: string): Promise<void> {
  return apiRequest(`/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' }).then(
    () => undefined,
  );
}

/**
 * The same rules the server enforces, used only to decide which controls are
 * worth showing. Hiding a button is a convenience, never the actual protection:
 * the server checks every request again.
 */
export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === 'OWNER';
}

export function assignableRoles(role: WorkspaceRole): AssignableRole[] {
  return role === 'OWNER' ? ['MEMBER', 'ADMIN'] : ['MEMBER'];
}

export function canRemoveMember(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  if (targetRole === 'OWNER') {
    return false;
  }

  return actorRole === 'OWNER' || (actorRole === 'ADMIN' && targetRole === 'MEMBER');
}
