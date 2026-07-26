# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 5 — Projects, Sprints and Issues — COMPLETED.**
Phase 6 (comments, activity feed and Kanban) has not started.

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

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (145 tests) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` / `db:seed` / `db:check` | migration status, seed, read-only check |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run test:auth` / `test:workspaces` / `test:projects` / `test:sprints` / `test:issues` | one server suite only |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 5)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Migration `add_project_issue_numbering` applied (dev + test) | Passed |
| `prisma generate` | Passed |
| `npm run db:seed` (re-run, idempotent) | Passed |
| `npm run test:projects` | Passed (22 tests) |
| `npm run test:sprints` | Passed (13 tests) |
| `npm run test:issues` | Passed (26 tests) |
| Client Phase 5 tests | Passed (19 tests) |
| `npm run test:auth` / `npm run test:workspaces` | Passed (12 / 30 tests) |
| `npm test` | Passed — client 39, server 106 |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Manual: frontend 5174, backend 4000, `GET /api/health` public | 200 / 200 / 200 |
| Manual: project list without a cookie | 401 |
| Manual: project reached through a foreign workspace id | 404 |
| Manual: seeded MEMBER creating a project | 403 |
| Manual: issue keys `API-1`, `API-2`, `WEB-1` | Correct |

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
- Issues: no comments, labels, attachments, subtasks, watchers or time tracking.
  `position` is set to the issue number and is not yet used for ordering.
- Activity rows are written (`PROJECT_CREATED`, `ISSUE_CREATED`,
  `ISSUE_UPDATED`, `ISSUE_STATUS_CHANGED`, `ISSUE_ASSIGNED`) but no activity
  feed endpoint or UI exists yet (Phase 6).
- Client data fetching is still plain `useEffect` + `useState`; no React Query,
  no cache. UI styling is minimal on purpose (Phase 9).
- Still open from Phase 3: login rate limiting, email verification, password
  reset, MFA, session management and a CSRF strategy for cross-site deployment.
- No Kanban board, no Docker, no CI, no lint tooling (Phases 6-8).

## Next Task

**Phase 6 — Comments, activity and Kanban.** Comment CRUD scoped to an issue, an
activity feed endpoint that reads the rows Phase 5 already writes, and a Kanban
board with drag-and-drop that finally uses `Issue.position`.
