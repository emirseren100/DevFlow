# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 6 — Comments, Activity and Kanban — COMPLETED.**
Phase 7 (frontend consolidation and dashboard) has not started.

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

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (223 tests) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` / `db:seed` / `db:check` | migration status, seed, read-only check |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run test:auth` / `test:workspaces` / `test:projects` / `test:sprints` / `test:issues` / `test:comments` / `test:activities` / `test:kanban` | one server suite only |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 6)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Schema change needed | None (no Phase 6 migration) |
| `npm run db:seed` (re-run, idempotent, column-local positions) | Passed |
| `npm run test:comments` | Passed (25 tests) |
| `npm run test:activities` | Passed (13 tests) |
| `npm run test:kanban` | Passed (21 tests) |
| Client Phase 6 tests | Passed (19 tests) |
| `npm run test:auth` / `test:workspaces` / `test:projects` / `test:sprints` / `test:issues` | Passed (unchanged) |
| `npm test` | Passed — client 58, server 165 (223 total) |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Manual: frontend 5174, backend 4000, `GET /api/health` public | 200 / 200 / 200 |
| Manual: board without a cookie | 401 |
| Manual: board columns from seed data | `BACKLOG 2, TODO 1, IN_PROGRESS 1, IN_REVIEW 1, DONE 1` |
| Manual: OWNER move `API-4` to `IN_PROGRESS` | Positions `0, 1`, one `ISSUE_STATUS_CHANGED` |
| Manual: comment created as the signed-in author | `canEdit: true` |
| Manual: seeded MEMBER moving an issue she neither reported nor owns | 403 |
| Manual: seeded MEMBER editing another user's comment | 403 |
| Manual: comment permissions for a MEMBER | own `canEdit`/`canDelete` true, others false |

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
- Client data fetching is still plain `useEffect` + `useState`; no React Query,
  no cache. UI styling is minimal on purpose (Phase 9).
- Still open from Phase 3: login rate limiting, email verification, password
  reset, MFA, session management and a CSRF strategy for cross-site deployment.
- No dashboard, no Docker, no CI, no lint tooling (Phases 7-8).

## Next Task

**Phase 7 — Frontend consolidation, dashboard and full integration.** Bring the
existing pages together: a real `/app` dashboard instead of the redirect to the
workspace list, shared layout and navigation, consistent loading and error
handling, and an end-to-end pass over the whole flow (register → workspace →
project → issue → board → comment).
