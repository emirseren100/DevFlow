import { useInfiniteQuery } from '@tanstack/react-query';

import { activityText } from '../lib/activityText';
import type { ActivityListResult } from '../lib/collaborationApi';
import { EmptyState, ErrorState, LoadingState } from './states';

interface ActivityFeedProps {
  heading: string;
  /** Identifies the feed in the cache. Built by the query-key factory. */
  queryKey: readonly unknown[];
  /** Loads one page of that feed. */
  load: (page: number, signal?: AbortSignal) => Promise<ActivityListResult>;
  emptyText: string;
}

/**
 * Shared feed for the project page and the issue page.
 *
 * Pages are appended, so "Load more" keeps what is already on screen. The
 * sentence for each row is generated here from the structured fields the server
 * sent; the database never stores a formatted line.
 */
export default function ActivityFeed({ heading, queryKey, load, emptyText }: ActivityFeedProps) {
  const feed = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => load(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });

  const items = feed.data?.pages.flatMap((page) => page.activities) ?? [];

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading">{heading}</h2>

      {feed.isPending && <LoadingState label="Loading activity…" />}

      {feed.isError && <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />}

      {feed.isSuccess && items.length === 0 && (
        <EmptyState title="Nothing here yet" description={emptyText} />
      )}

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

      {feed.hasNextPage && (
        <button
          type="button"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage ? 'Loading…' : 'Load more activity'}
        </button>
      )}
    </section>
  );
}
