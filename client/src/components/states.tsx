import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { errorMessage, errorStatus } from '../lib/apiClient';

/**
 * The three states every server-backed screen needs.
 *
 * They live together because they are always used together: a page either
 * waits, fails, has nothing to show, or shows data. Nothing renders a blank
 * screen while a request is in flight.
 */

/** `role="status"` makes a screen reader announce the wait politely. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="state state--loading" role="status">
      {label}
    </p>
  );
}

/**
 * A small "refreshing" hint for a background refetch.
 *
 * Data is already on screen, so replacing the page with a spinner would be a
 * step backwards; this only tells the user that newer data is on its way.
 */
export function RefreshingHint({ isRefreshing }: { isRefreshing: boolean }) {
  if (!isRefreshing) {
    return null;
  }

  return (
    <p className="state state--refreshing" role="status">
      Refreshing…
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  /** What to do next. An empty state without a next step is just a dead end. */
  action?: ReactNode;
}) {
  return (
    <div className="state state--empty">
      <p className="state__title">{title}</p>
      <p>{description}</p>
      {action}
    </div>
  );
}

/** Wording per HTTP status. The server code itself is never shown as the message. */
function describe(status: number): { title: string; hint: string; canRetry: boolean } {
  if (status === 403) {
    return {
      title: 'You do not have permission',
      hint: 'Your role in this workspace does not allow this. Ask an owner or admin if you need access.',
      canRetry: false,
    };
  }

  if (status === 404) {
    return {
      title: 'Not found',
      hint: 'This item does not exist, or it is no longer available to you.',
      canRetry: false,
    };
  }

  if (status === 401) {
    return {
      title: 'Your session has ended',
      hint: 'Please sign in again to continue.',
      canRetry: false,
    };
  }

  return {
    title: 'Something went wrong',
    hint: 'The request did not finish. You can try again.',
    canRetry: true,
  };
}

/**
 * One error state for every screen.
 *
 * 403 and 404 are expected answers, not bugs, so they get their own wording and
 * no retry button — repeating the same request would fail the same way. Every
 * other failure offers a retry and a way out of the page. The raw error code
 * stays in the console for troubleshooting and never reaches the user.
 */
export function ErrorState({
  error,
  onRetry,
  backTo = '/app/workspaces',
  backLabel = 'Back to workspaces',
}: {
  error: unknown;
  onRetry?: () => void;
  backTo?: string;
  backLabel?: string;
}) {
  const status = errorStatus(error);
  const { title, hint, canRetry } = describe(status);

  return (
    <div className="state state--error" role="alert">
      <p className="state__title">{title}</p>
      <p>{hint}</p>
      <p className="state__detail">{errorMessage(error)}</p>

      {canRetry && onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}

      <p>
        <Link to={backTo}>{backLabel}</Link>
      </p>
    </div>
  );
}

/**
 * Explains why a control is missing. Hiding a button is a convenience only —
 * the server checks every request again.
 */
export function PermissionNotice({ children }: { children: ReactNode }) {
  return <p className="state state--permission">{children}</p>;
}
