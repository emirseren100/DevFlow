import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import ActivityFeed from '../components/ActivityFeed';
import ProjectNav from '../components/ProjectNav';
import { listProjectActivities } from '../lib/collaborationApi';

export default function ProjectActivityPage() {
  const { workspaceId = '', projectId = '' } = useParams();

  // Stable between renders, so the feed refetches only when the page changes.
  const load = useCallback(
    (page: number) => listProjectActivities(workspaceId, projectId, page),
    [workspaceId, projectId],
  );

  return (
    <section>
      <ProjectNav workspaceId={workspaceId} projectId={projectId} />

      <h1>Project activity</h1>

      <ActivityFeed
        heading="Recent activity"
        load={load}
        emptyText="Nothing has happened in this project yet."
      />
    </section>
  );
}
