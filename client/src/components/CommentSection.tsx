import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError } from '../lib/apiClient';
import type { Comment } from '../lib/collaborationApi';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../lib/collaborationApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError(null);

    listComments(workspaceId, projectId, issueId)
      .then((list) => {
        if (active) setComments(list);
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
  }, [workspaceId, projectId, issueId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    try {
      const created = await createComment(workspaceId, projectId, issueId, draft);

      setComments((current) => [...current, created]);
      setDraft('');
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(event: FormEvent, commentId: string) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    try {
      const updated = await updateComment(workspaceId, projectId, issueId, commentId, editDraft);

      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? updated : comment)),
      );
      setEditingId(null);
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setIsSubmitting(true);
    setActionError(null);

    try {
      await deleteComment(workspaceId, projectId, issueId, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setConfirmingId(null);
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading">
      <h2 id="comments-heading">Comments</h2>

      {isLoading && <p role="status">Loading comments…</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {!isLoading && !loadError && comments.length === 0 && (
        <p>No comment yet. Be the first to write one.</p>
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
                      onClick={() => handleDelete(comment.id)}
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
