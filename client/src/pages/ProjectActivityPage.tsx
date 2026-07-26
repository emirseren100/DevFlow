import { useParams } from 'react-router-dom';

import ActivityFeed from '../components/ActivityFeed';
import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import ProjectNav from '../components/ProjectNav';
import { listProjectActivities } from '../lib/collaborationApi';
import { queryKeys } from '../lib/queryKeys';

export default function ProjectActivityPage() {
  const { workspaceId = '', projectId = '' } = useParams();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: 'Projects', to: `/app/workspaces/${workspaceId}/projects` },
          {
            label: 'Project',
            to: `/app/workspaces/${workspaceId}/projects/${projectId}`,
          },
          { label: 'Activity' },
        ]}
      />

      <ProjectNav workspaceId={workspaceId} projectId={projectId} />

      <PageHeader
        title="Project activity"
        description="Everything the system recorded for this project, newest first."
      />

      <ActivityFeed
        heading="Recent activity"
        queryKey={queryKeys.projectActivity(workspaceId, projectId)}
        load={(page, signal) =>
          listProjectActivities(workspaceId, projectId, page, undefined, signal)
        }
        emptyText="Nothing has happened in this project yet."
      />
    </>
  );
}
