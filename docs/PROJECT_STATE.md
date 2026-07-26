# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 7 — Dashboard, Application Shell and Frontend Integration — COMPLETED.**
Phase 8 (testing hardening, Docker, CI and security) has not started.

## Completed Work

- Phase 0: rules, architecture, roadmap, decisions, learning log.
- Phase 1: npm workspaces, React client (5174), Express server (4000),
  `/api/health`, CORS, first tests.
- Phase 2: Prisma 7 + PostgreSQL schema, initial migration, shared Prisma
  Client, idempotent seed, read-only database check, database npm scripts.
- Phase 3: email/password authentication with database-backed cookie sessions,
  `requireAuth` middleware, client auth pages and a protected `/app` route,
  dedicated test database and auth integration tests.
- Phase 4: workspace CRUD, membership management and role-based authorization,
  client workspace pages, workspace integration and component tests.
- Phase 5: project, sprint and issue API with project-scoped issue numbers,
  client project and issue pages, Phase 5 integration and component tests.
- Phase 6: issue comments, project and issue activity feeds, Kanban board with
  server-owned transactional ordering, client board/activity/comment UI, Phase 6
  integration and component tests.
- Phase 7: workspace dashboard endpoint, dashboard page, shared authenticated
  application shell with workspace switcher and navigation, TanStack Query as
  the single server-state layer with centralized query keys and targeted
  invalidation, shared loading/empty/error states, 403 and 404 experiences, and
  a responsive structural layout.

## Current Architecture

Phase 1-4 layout unchanged. Added:

```
server/src/modules/projects/  project.routes | schemas | service |
                              authorization | types
server/src/modules/sprints/   sprint.routes | schemas | service
server/src/modules/issues/    issue.routes | schemas | service |
                              authorization | types
server/src/lib/parseQuery.ts  query string -> INVALID_SORT / INVALID_FILTER
client/src/lib/projectApi.ts  typed project, sprint and issue calls
client/src/pages/ProjectListPage.tsx | ProjectDetailPage.tsx |
                  IssueCreatePage.tsx | IssueDetailPage.tsx
```

Phase 6 added:

```
server/src/modules/comments/    comment.routes | schemas | service |
                                authorization | types
server/src/modules/activities/  activity.routes | schemas | service | types
server/src/modules/kanban/      kanban.routes | schemas | service | types
client/src/lib/collaborationApi.ts   comment, activity, board and move calls
client/src/lib/activityText.ts       structured fields -> readable sentence
client/src/components/CommentSection.tsx | ActivityFeed.tsx | ProjectNav.tsx
client/src/pages/BoardPage.tsx | ProjectActivityPage.tsx
```

Phase 7 added:

```
server/src/modules/dashboard/   dashboard.routes | service | types
client/src/lib/queryKeys.ts     every TanStack Query key, in one factory
client/src/lib/queryClient.ts   the one QueryClient and its defaults
client/src/lib/dashboardApi.ts  typed dashboard call
client/src/hooks/useWorkspaces.ts   shared workspace list + current workspace
client/src/layouts/AppShell.tsx     the authenticated frame
client/src/components/WorkspaceSwitcher.tsx | WorkspaceNavigation.tsx |
                      Breadcrumbs.tsx | PageHeader.tsx | states.tsx | badges.tsx
client/src/pages/DashboardPage.tsx | MembersPage.tsx
```

**No migration in Phase 7.** The dashboard only reads existing tables.

`client/src/pages/AppPage.tsx` was replaced by `layouts/AppShell.tsx`. Member
management moved out of the workspace detail page into `MembersPage`; the old
page is now workspace **settings** (rename and danger zone).

**No migration in Phase 6.** `Comment`, `ActivityLog`, `Issue.position` and
`Issue.status` already existed from Phase 2, so the phase needed no schema change.

**Migration** `20260726020000_add_project_issue_numbering`: adds
`Project.nextIssueNumber` (default 1) and `Issue.number` with a composite unique
index on `(projectId, number)`. Existing rows were numbered per project by the
migration itself, and each project counter was moved past its highest number, so
no development data was reset.

**Project endpoints:** `GET|POST /api/workspaces/:workspaceId/projects`,
`GET|PATCH|DELETE /api/workspaces/:workspaceId/projects/:projectId`.

**Sprint endpoints:** `GET|POST .../projects/:projectId/sprints`,
`PATCH|DELETE .../projects/:projectId/sprints/:sprintId`.

**Issue endpoints:** `GET|POST .../projects/:projectId/issues`,
`GET|PATCH|DELETE .../projects/:projectId/issues/:issueId`.

**Comment endpoints:** `GET|POST .../issues/:issueId/comments`,
`PATCH|DELETE .../issues/:issueId/comments/:commentId`.

**Activity endpoints:** `GET .../projects/:projectId/activities`,
`GET .../projects/:projectId/issues/:issueId/activities` — both with `page`,
`limit` (20 default, 100 max) and optional `type`, ordered `createdAt desc, id
desc`.

**Kanban endpoints:** `GET .../projects/:projectId/board`,
`PATCH .../projects/:projectId/issues/:issueId/move` (`targetStatus`,
`targetIndex` only).

**Dashboard endpoint:** `GET /api/workspaces/:workspaceId/dashboard` — any
member. Returns the workspace summary (role, member count, active and archived
project counts), issue metrics (open, assigned to me, overdue, unassigned), the
full status and priority distributions with explicit zeros, ~5 recently updated
issues and ~8 recent activity rows, plus `generatedAt`. All counts come from
Prisma `count`/`groupBy` filtered by `project: { workspaceId }`; no issue
description, comment body or nested record is selected. `DONE` counts as closed,
and overdue is `dueDate < now` measured against the **server** clock.

**Authorization matrix (Phase 5)**

| Action | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| View projects, sprints, issues | yes | yes | yes |
| Create / update / archive / delete a project | yes | yes | no |
| Create / update / delete a sprint | yes | yes | no |
| Create an issue | yes | yes | yes |
| Update any issue | yes | yes | no |
| Update an issue they report or are assigned to | yes | yes | yes |
| Delete an issue | yes | yes | no |

**Authorization matrix (Phase 6)**

| Action | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| View comments, activity, board | yes | yes | yes |
| Create a comment | yes | yes | yes |
| Edit a comment | own only | own only | own only |
| Delete a comment | any | any | own only |
| Move / reorder any issue | yes | yes | no |
| Move an issue they report or are assigned to | yes | yes | yes |

**Ordering and transactions.** `Issue.position` is a column-local integer
(`0, 1, 2, …`). A move reads the destination column in real order, clamps
`targetIndex` to its length (a negative index is `400 VALIDATION_ERROR`), inserts
the card, renumbers the destination and — on a status change — the source column,
and writes one `ISSUE_STATUS_CHANGED` row. Everything runs in one `Serializable`
`prisma.$transaction`, retried up to 3 times on Prisma `P2034`. A same-column
reorder writes no activity. The response is the confirmed board, which is also
what the client renders; a failed move rolls the client back to the previous
board. Creating an issue, and changing its status through
`PATCH .../issues/:issueId`, now append it to the end of its target column.

**Activity metadata** is sanitized against a key whitelist on the way out
(`previousStatus`, `nextStatus`, `previousAssigneeId`, `nextAssigneeId`,
`changedFields`, `commentId`, `number`, `key`, `slug`, `addedUserId`,
`assignedRole`). Sentences are generated in the client, never stored.

New error code: `COMMENT_NOT_FOUND`.

`requireWorkspaceMember` (Phase 4) still resolves the real role, then
`requireProject` loads the project **filtered by the workspace id from the URL**,
so a project id from another workspace gives `404 PROJECT_NOT_FOUND`. Sprints and
issues are always looked up with their `projectId` in the filter as well.

**Issue numbering.** Each project owns `nextIssueNumber`. Creating an issue runs
one transaction: increment the counter, take the value it just passed, insert the
issue. The row lock serialises concurrent requests, and the unique index on
`(projectId, number)` is the backstop. The display key `API-14` is derived from
the project key and the number, never stored twice.

**Relation validation.** An assignee must have a `WorkspaceMember` row in the
issue's workspace (`400 INVALID_ASSIGNEE`); a sprint must belong to the same
project (`400 INVALID_SPRINT`). `reporterId`, `number`, `projectId` and
`workspaceId` are never read from the request body.

New error codes: `PROJECT_NOT_FOUND`, `PROJECT_KEY_IN_USE`, `SPRINT_NOT_FOUND`,
`SPRINT_HAS_ISSUES`, `ISSUE_NOT_FOUND`, `INVALID_ASSIGNEE`, `INVALID_SPRINT`,
`INVALID_DATE_RANGE`, `INVALID_FILTER`, `INVALID_SORT`.

**Client routes:** `/app/workspaces/:workspaceId/projects`,
`.../projects/:projectId`, `.../projects/:projectId/issues/new`,
`.../projects/:projectId/issues/:issueId`. The issue filters live in the URL
query string, so a reload or a shared link restores the same view. Controls the
current role may not use are hidden; the server checks every request again.

Phase 6 client routes: `.../projects/:projectId/board` (five columns, `@dnd-kit`
drag-and-drop, per-card "Move … to" fallback) and
`.../projects/:projectId/activity` (paginated feed with "Load more"). The issue
detail page now also carries the comment section and the issue history. Every
project page links between **Issues**, **Board** and **Activity**.

**Phase 7 client structure.** `RootLayout` keeps the public site; everything
behind `/app` renders inside `AppShell` (brand, workspace switcher, workspace
navigation, current user, sign out, one `<main>`). `/app` redirects to
`/app/workspaces`, and `/app/workspaces/:workspaceId` redirects to
`.../dashboard`. New routes: `.../dashboard`, `.../members`, `.../settings`.
An unknown address inside `/app` renders the not-found page inside the shell.

**Server state** is TanStack Query (`@tanstack/react-query` 5). One
`QueryClient`, created in `App` inside `AuthProvider` so a `401` calls
`clearUser`; defaults are `retry: false`, no refetch on focus, `staleTime`
30s — error states offer a visible "Try again" instead of silent retries. Every
key comes from `lib/queryKeys.ts`; a scope key is the prefix of everything below
it, so `exact: true` and the `…Lists` helpers are used where a narrower scope is
meant. `AuthProvider` still owns the authentication lifecycle.

**Invalidation after a mutation** (targeted, never global): member changes →
members + workspace + dashboard + workspace list; project create/update/delete →
project lists + project detail + dashboard; issue create/update/delete → issue
lists + project detail + board + project activity + dashboard; comments →
comments + issue activity + project activity + dashboard; Kanban move → board
always, and only on a real status change also the issue, the issue lists, the
project detail, the feeds and the dashboard.

**Shared components:** `AppShell`, `WorkspaceSwitcher`, `WorkspaceNavigation`,
`Breadcrumbs`, `PageHeader`, `LoadingState`, `RefreshingHint`, `EmptyState`,
`ErrorState`, `PermissionNotice`, `StatusBadge`, `PriorityBadge`. `ErrorState`
picks its wording from the HTTP status: 403 explains the missing permission, 404
the missing resource, and neither offers a retry.

**Responsive structure:** one breakpoint at 900px. Below it the navigation
collapses behind a `Menu` button (`aria-expanded`, `aria-controls`, focus
returned on close); dashboard cards wrap through a grid; the board scrolls
horizontally. This is layout only — visual identity is still Phase 9.

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (264 tests) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` / `db:seed` / `db:check` | migration status, seed, read-only check |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run test:auth` / `test:workspaces` / `test:projects` / `test:sprints` / `test:issues` / `test:comments` / `test:activities` / `test:kanban` / `test:dashboard` | one server suite only |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 7)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Schema change needed | None (no Phase 7 migration) |
| `npm run test:dashboard` | Passed (17 tests) |
| Client Phase 7 tests (`phase7.test.tsx`) | Passed (21 tests) |
| Migrated client tests (workspaces, projects, Phase 6, auth) | Passed |
| `npm test` | Passed — client 82, server 182 (264 total) |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Manual: frontend 5174, backend 4000, `GET /api/health` public | 200 / 200 / 200 |
| Manual: dashboard without a cookie | 401 |
| Manual: dashboard of an unknown workspace | 404 |
| Manual: seeded `Orbit Labs` dashboard | 3 members, 2 active projects, 8 open issues, 1 assigned to Ada, 0 overdue, 3 unassigned |
| Manual: seeded status / priority distribution | `3/2/2/1/2` and `3/3/3/1`, all keys present |
| Manual: recent lists | 5 issues, 8 activities |
| Manual: dashboard response scanned for `passwordHash`, `tokenHash`, `description` | none present |

## Known Limitations

- Test database: still the isolated PostgreSQL **schema** `devflow_test` on the
  disposable `prisma dev` server described in Phase 3 (no local PostgreSQL and
  no Docker on this machine). Its URLs in `server/.env` and `server/.env.test`
  change whenever that server is recreated, and the server must be started with
  `npx prisma dev --name devflow` before any database command.
- **That local server drops connections past a couple**, which corrupted
  requests running in parallel (`08P01`, spurious `403`). `DATABASE_POOL_MAX`
  (new, read in `config.ts`) keeps the pool at `2` locally; a real PostgreSQL
  server can use `10`.
- `prisma migrate dev` still fails against that server (`P1017`); migrations are
  written by hand and applied with `prisma migrate deploy`.
- Projects: keys cannot be changed after creation, and deletion is permanent —
  no soft delete and no undo. Deleting a project removes its sprints, issues and
  their comments; users, memberships and the workspace are untouched.
- Sprints: no capacity, no automatic scheduling, and a sprint holding issues
  cannot be deleted (`409 SPRINT_HAS_ISSUES`).
- Issues: no labels, attachments, subtasks, watchers, time tracking or
  dependencies.
- Comments: plain text only — no Markdown, no HTML, no mentions, no reactions,
  no nested replies, no edit history, and no pagination (all comments of an issue
  are returned).
- Kanban: no swimlanes, no per-column WIP limits, no sprint-scoped board, and no
  multi-card selection. Column order is fixed to the `IssueStatus` order.
- **No realtime updates.** Another user's move, comment or status change appears
  only after a reload; there are no WebSockets, no notifications and no emails.
- Activity is an append-only feed with no delete, no export and no workspace-wide
  view (project- and issue-scoped only).
- Server state is TanStack Query, but the dashboard is still a plain request per
  visit: there is no realtime push and no polling, so another person's change
  appears on the next refetch (after the 30s `staleTime`, a mutation, or a
  reload).
- The dashboard has no date-range filter, no per-project breakdown and no export;
  "assigned to me" and "overdue" both count open issues only.
- There is no workspace-wide issue list, so the "Open issues", "Assigned to me"
  and "Overdue issues" cards deliberately link nowhere.
- Activity is still project- and issue-scoped; the only workspace-wide view is
  the dashboard's eight most recent rows.
- UI styling is structural only — layout, wrapping and a single 900px
  breakpoint. Visual identity is Phase 9.
- Still open from Phase 3: login rate limiting, email verification, password
  reset, MFA, session management and a CSRF strategy for cross-site deployment.
- No Docker, no CI, no lint tooling (Phase 8).

## Next Task

**Phase 8 — Testing hardening, Docker, CI and security.** Raise coverage on the
paths the integration tests do not reach, add Docker Compose for PostgreSQL and
both services, add a GitHub Actions pipeline (typecheck, test, build), add lint
tooling, and close the security items still open from Phase 3 (login rate
limiting, session management, a CSRF strategy for cross-site deployment).
