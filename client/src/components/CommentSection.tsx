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
import ConfirmDialog from './ConfirmDialog';
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
    <section className="panel stack" aria-labelledby="comments-heading">
      <div className="panel__header">
        <h2 id="comments-heading">Comments</h2>
        {comments.length > 0 && <span className="faint">{comments.length}</span>}
      </div>

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
        <ul className="comment-list">
          {comments.map((comment) => (
            <li className="comment" key={comment.id}>
              <p className="comment__head">
                <strong className="comment__author">{comment.author.name}</strong>
                <time dateTime={comment.createdAt}>
                  {new Date(comment.createdAt).toLocaleString()}
                </time>
                {comment.isEdited && <span className="comment__edited">edited</span>}
              </p>

              {editingId === comment.id ? (
                <form className="form" onSubmit={(event) => handleUpdate(event, comment.id)}>
                  <div className="field">
                    <label htmlFor={`edit-comment-${comment.id}`}>Edit comment</label>
                    <textarea
                      id={`edit-comment-${comment.id}`}
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      maxLength={5000}
                      required
                    />
                  </div>
                  <div className="form__row">
                    <button type="submit" disabled={isSubmitting}>
                      Save comment
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={isSubmitting}
                    >
                      Cancel edit
                    </button>
                  </div>
                </form>
              ) : (
                <p className="comment__body">{comment.body}</p>
              )}

              <div className="record__actions">
                {comment.permissions.canEdit && editingId !== comment.id && (
                  <button
                    type="button"
                    className="btn--ghost btn--sm"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditDraft(comment.body);
                    }}
                    disabled={isSubmitting}
                  >
                    Edit comment
                  </button>
                )}

                {comment.permissions.canDelete && (
                  <button
                    type="button"
                    className="btn--ghost btn--sm"
                    onClick={() => setConfirmingId(comment.id)}
                    disabled={isSubmitting}
                  >
                    Delete comment
                  </button>
                )}
              </div>

              {confirmingId === comment.id && (
                <ConfirmDialog
                  title="Delete this comment?"
                  confirmLabel="Confirm delete comment"
                  cancelLabel="Cancel delete comment"
                  isBusy={isSubmitting}
                  onCancel={() => setConfirmingId(null)}
                  onConfirm={() => deleteMutation.mutate(comment.id)}
                >
                  Deleting this comment cannot be undone.
                </ConfirmDialog>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="form" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="new-comment">Add a comment</label>
          <textarea
            id="new-comment"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={5000}
            required
          />
          <span className="field__hint">Plain text. Line breaks are kept as written.</span>
        </div>
        <div className="form__row">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving comment…' : 'Add comment'}
          </button>
        </div>
      </form>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
    </section>
  );
}
