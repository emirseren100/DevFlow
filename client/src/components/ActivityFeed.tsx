import { useEffect, useState } from 'react';

import { ApiError } from '../lib/apiClient';
import { activityText } from '../lib/activityText';
import type { ActivityItem, ActivityListResult } from '../lib/collaborationApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

interface ActivityFeedProps {
  heading: string;
  /**
   * Loads one page. The caller decides which feed this is and must keep the
   * function stable (`useCallback`), because a new function means a refetch.
   */
  load: (page: number) => Promise<ActivityListResult>;
  emptyText: string;
}

/**
 * Shared feed for the project page and the issue page.
 *
 * Pages are appended, so "Load more" keeps what is already on screen. The
 * sentence for each row is generated here from the structured fields.
 */
export default function ActivityFeed({ heading, load, emptyText }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    load(page)
      .then((result) => {
        if (!active) return;

        // Page 1 replaces the list; a later page is appended to it.
        setItems((current) =>
          page === 1 ? result.activities : [...current, ...result.activities],
        );
        setHasNextPage(result.pagination.hasNextPage);
      })
      .catch((loadError: unknown) => {
        if (active) setError(messageOf(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [load, page]);

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading">{heading}</h2>

      {isLoading && items.length === 0 && <p role="status">Loading activity…</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !error && items.length === 0 && <p>{emptyText}</p>}

      {items.length > 0 && (
        <ul>
          {items.map((activity) => (
            <li key={activity.id}>
              {activityText(activity)}{' '}
              <time dateTime={activity.createdAt}>
                {new Date(activity.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <button type="button" onClick={() => setPage(page + 1)} disabled={isLoading}>
          Load more activity
        </button>
      )}
    </section>
  );
}
