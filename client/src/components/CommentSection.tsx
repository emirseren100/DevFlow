import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { errorMessage } from '../lib/apiClient';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../lib/collaborationApi';
import { queryKeys } from '../lib/queryKeys';
import { EmptyState, ErrorState, LoadingState } from './states';

interface CommentSectionProps {
  workspaceId: string;
  projectId: string;
  issueId: string;
}

/**
 * Plain-text comments.
 *
 * The body is rendered as text inside a paragraph with `white-space: pre-wrap`,
 * so line breaks survive while any HTML a user types stays visible characters
 * instead of markup. Which controls appear is decided by the server flags.
 */
export default function CommentSection({ workspaceId, projectId, issueId }: CommentSectionProps) {
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(workspaceId, projectId, issueId),
    queryFn: ({ signal }) => listComments(workspaceId, projectId, issueId, signal),
  });

  /**
   * A comment shows up in three other places: the issue history, the project
   * feed and the recent activity of the dashboard. Those are refreshed — and
   * nothing else is.
   */
  function invalidateAfterComment() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.comments(workspaceId, projectId, issueId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.issueActivity(workspaceId, projectId, issueId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.projectActivity(workspaceId, projectId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
  }

  const createMutation = useMutation({
    mutationFn: (body: string) => createComment(workspaceId, projectId, issueId, body),
    onSuccess: () => {
      setDraft('');
      setActionError(null);
      invalidateAfterComment();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { commentId: string; body: string }) =>
      updateComment(workspaceId, projectId, issueId, input.commentId, input.body),
    onSuccess: () => {
      setEditingId(null);
      setActionError(null);
      invalidateAfterComment();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteComment(workspaceId, projectId, issueId, commentId),
    onSuccess: () => {
      setConfirmingId(null);
      setActionError(null);
      invalidateAfterComment();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const comments = commentsQuery.data ?? [];
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(draft);
  }

  function handleUpdate(event: FormEvent, commentId: string) {
    event.preventDefault();
    updateMutation.mutate({ commentId, body: editDraft });
  }

  return (
    <section aria-labelledby="comments-heading">
      <h2 id="comments-heading">Comments</h2>

      {commentsQuery.isPending && <LoadingState label="Loading comments…" />}

      {commentsQuery.isError && (
        <ErrorState error={commentsQuery.error} onRetry={() => void commentsQuery.refetch()} />
      )}

      {commentsQuery.isSuccess && comments.length === 0 && (
        <EmptyState
          title="No comment yet"
          description="Be the first to write one with the form below."
        />
      )}

      {comments.length > 0 && (
        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>
              <p>
                <strong>{comment.author.name}</strong>{' '}
                <time dateTime={comment.createdAt}>
                  {new Date(comment.createdAt).toLocaleString()}
                </time>
                {comment.isEdited && <span> (edited)</span>}
              </p>

              {editingId === comment.id ? (
                <form onSubmit={(event) => handleUpdate(event, comment.id)}>
                  <label htmlFor={`edit-comment-${comment.id}`}>Edit comment</label>
                  <textarea
                    id={`edit-comment-${comment.id}`}
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    maxLength={5000}
                    required
                  />
                  <button type="submit" disabled={isSubmitting}>
                    Save comment
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} disabled={isSubmitting}>
                    Cancel edit
                  </button>
                </form>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{comment.body}</p>
              )}

              {comment.permissions.canEdit && editingId !== comment.id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditDraft(comment.body);
                  }}
                  disabled={isSubmitting}
                >
                  Edit comment
                </button>
              )}

              {comment.permissions.canDelete &&
                (confirmingId === comment.id ? (
                  <>
                    <p role="alert">Deleting this comment cannot be undone.</p>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(comment.id)}
                      disabled={isSubmitting}
                    >
                      Confirm delete comment
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={isSubmitting}
                    >
                      Cancel delete comment
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(comment.id)}
                    disabled={isSubmitting}
                  >
                    Delete comment
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate}>
        <label htmlFor="new-comment">Add a comment</label>
        <textarea
          id="new-comment"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={5000}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving comment…' : 'Add comment'}
        </button>
      </form>

      {actionError && <p role="alert">{actionError}</p>}
    </section>
  );
}
