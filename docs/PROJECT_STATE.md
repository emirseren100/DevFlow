# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-27

## Current Phase

**Phase 9A — Final UI/UX Refinement and Browser QA — COMPLETED.** The
application has one visual language, the pages were inspected and exercised in a
real browser with seeded data as OWNER, ADMIN and MEMBER, and typecheck, the
full test suite, the production build and `docker compose config` all pass.
Phase 9B (GitHub, deployment and portfolio preparation) has not started, and
nothing has been committed, pushed or deployed.

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
- Phase 8: Zod environment validation, Helmet, auth rate limiting, allowed-origin
  protection for mutations, a JSON body limit, production-safe errors, test
  hardening and coverage, multi-stage Dockerfiles, a Docker Compose stack and a
  GitHub Actions CI workflow.
- Phase 9A: one CSS token set and visual language, a shared confirmation
  dialog, human labels for every enum, polished authentication, dashboard,
  workspace, member, project, issue, Kanban, comment and activity screens, and
  a responsive, keyboard-usable layout verified in a browser.
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

Phase 8 added:

```
server/src/config.ts                      Zod-validated environment, one module
server/src/middleware/requireAllowedOrigin.ts   Origin check for mutations
server/src/middleware/rateLimit.ts        login/register limiter
server/src/test/security.test.ts          Phase 8 security suite
client/src/lib/env.ts                     the client's only VITE_ read
server/Dockerfile | client/Dockerfile | client/nginx.conf
docker-compose.yml | .env.docker.example | .dockerignore files
.github/workflows/ci.yml
```

**No migration in Phase 8.** No schema change was needed.

Phase 9A added:

```
client/src/index.css                    the whole visual system, one file
client/src/components/ConfirmDialog.tsx the one modal for destructive actions
client/src/test/phase9.test.tsx         mobile navigation, dialog a11y, 403 state
```

**No migration and no API change in Phase 9A.** Nothing on the server was
touched: the phase changed markup, CSS and user-facing wording only. New label
maps (`TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `SPRINT_STATUS_LABELS` in
`projectApi.ts`, `ROLE_LABELS` in `workspaceApi.ts`) turn the database enums
into readable words in the client, so `IN_PROGRESS` never reaches a screen.

## Visual System (Phase 9A)

`client/src/index.css` is the single source: tokens first, then the browser
elements the application uses, then the repeated blocks. A dark charcoal shell
(`--bg #0e1116`) with three surfaces above it, thin borders, one emerald accent
(`--accent #10b981`) reserved for the active state and the primary action, and
semantic danger/warning/success/info colours that are always paired with a
word. Six spacing steps, one radius, one focus ring, five type sizes. No UI
framework, no CSS-in-JS, no charting package: the distribution bars are still a
`width: %` span next to a number.

**Rules that keep it consistent.** No component invents a colour. Status is
never signalled by colour alone — every badge spells its value out. Buttons
default to the secondary style, `[type="submit"]` is the primary action, and
`.btn--danger` is the only way to look destructive. Every form is capped at
`34rem` so it cannot stretch across a desktop.

**Shared pieces:** `AppShell`, `WorkspaceSwitcher`, `WorkspaceNavigation`,
`Breadcrumbs`, `PageHeader` (a `div`, not a second `banner` inside `main`),
`ProjectNav`, `StatusBadge`, `PriorityBadge`, `TypeBadge`,
`ProjectStatusBadge`, `RoleBadge`, `ConfirmDialog`, and the loading, refreshing,
empty, error and permission states.

**ConfirmDialog** replaces the old inline "click delete twice" pattern
everywhere a workspace, project, issue, comment or membership is destroyed. It
is `role="dialog" aria-modal="true"`, named by its own heading, opens with focus
on **Cancel** (the safe choice), traps Tab, closes on Escape and returns focus
to whatever opened it.

**Responsive.** Still one structural breakpoint at 900px — the navigation
collapses behind the Menu button, the user's email is dropped, the board keeps
scrolling sideways — plus a small 560px pass that stacks the filter bar and
gives page and dialog actions full-width touch targets.

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

## Security and Infrastructure (Phase 8)

**Middleware order** in `createApp()`: `x-powered-by` off → Helmet → CORS →
`express.json({ limit: '100kb' })` → cookie-parser → allowed-origin check →
auth rate limiter (only on the two auth paths) → routers → 404 → error handler.

**Environment.** `config.ts` parses `process.env` with Zod once at startup.
`NODE_ENV` is limited to `development | test | production`, `PORT` and
`SESSION_TTL_DAYS` become numbers, `CLIENT_ORIGIN` must be an absolute http(s)
origin, and `DATABASE_URL` has no default. Failures list variable names and
rules only — never a value, so the database password is never printed. New
optional keys: `AUTH_RATE_LIMIT_MAX` (10), `AUTH_RATE_LIMIT_WINDOW_MINUTES` (15).

**New error codes:** `RATE_LIMITED` (429), `INVALID_ORIGIN` (403),
`PAYLOAD_TOO_LARGE` (413), `MALFORMED_JSON` (400).

**Origin rule.** `POST/PUT/PATCH/DELETE` require `Origin === CLIENT_ORIGIN`.
`GET/HEAD/OPTIONS` are never blocked, so the CORS preflight still works. A
*missing* `Origin` is accepted outside production (Supertest and curl are not
browsers, and a browser cannot omit it on a mutation) and refused in production.
The deployment topology must be reviewed again in Phase 9.

**Rate limit.** In-memory, per IP, on `POST /api/auth/login` and
`POST /api/auth/register` only. Disabled under `NODE_ENV=test`; the behaviour is
covered by a purpose-built limiter in `security.test.ts`.

**Docker.** `Client (nginx :80) → Server (:4000) → PostgreSQL (:5432)` on one
Compose network. Host ports are chosen to coexist with a local setup: client
**5175** (Vite keeps 5174), PostgreSQL **5433** (a local PostgreSQL keeps 5432),
API 4000. The server waits for the database healthcheck, then runs
`prisma migrate deploy` before `node dist/server.js`. The seed never runs
automatically. `docker compose down` keeps the named volume; `down -v` deletes
all Docker PostgreSQL data.

**CI.** `.github/workflows/ci.yml` on pull requests and pushes to `main`:
`npm ci` → `db:validate` → `db:generate` → `db:deploy` → `typecheck` → `test` →
`build`, against a disposable `devflow_test` PostgreSQL service container. No
step uses `continue-on-error`. The workflow does not deploy.

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (284 tests) |
| `npm run test:client` / `npm run test:server` | one side only |
| `npm run test:coverage` | text + HTML + lcov, both workspaces |
| `npm run db:deploy` | `prisma migrate deploy` (containers and CI use this) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` / `db:seed` / `db:check` | migration status, seed, read-only check |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run test:auth` / `test:workspaces` / `test:projects` / `test:sprints` / `test:issues` / `test:comments` / `test:activities` / `test:kanban` / `test:dashboard` / `test:security` | one server suite only |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 9A)

| Check | Status |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | Passed — client 89, server 202 (291 total) |
| `npm run build` | Passed — client CSS 18.97 kB (3.95 kB gzip), JS 386.82 kB (117.26 kB gzip) |
| `docker compose config` | **Passed — Docker is installed on this machine now** |
| Browser QA — routes | login, register, home, workspace list, dashboard, members, settings, project list, project detail, issue list, issue create, issue detail, comments, issue history, project activity, board, 404 inside the shell — all render with real seeded data |
| Browser QA — roles | OWNER (Ada), ADMIN (Boris), MEMBER (Ceyda), each signed in through the real login form |
| OWNER | Sees Settings, the danger zone, member role selectors and removal |
| ADMIN | Renames the workspace, manages projects and members; no workspace danger zone |
| MEMBER | No Settings link, no project settings, no member management; still creates issues, comments, and moves only the cards the server marked `canMove` |
| Functional re-check | Kanban move as MEMBER, comment create and delete, project delete dialog cancelled, sign out and sign in — all worked, and the feeds and counts refreshed |
| Responsive | 1440, 1024, 768 and 390 — `document.body.scrollWidth` equals the viewport on every audited route |
| Long names | A 60-character unbroken workspace name wraps instead of widening the page |
| Accessibility | One `banner`, one `main`, labelled `nav` landmarks, `h1` then `h2`s, visible 2px focus ring, dialog focus and Escape verified |
| Contrast | Body 15.7:1, muted 6.8:1, faint 4.9:1, accent 9.1:1, danger 6.3:1 — all above 4.5:1 |
| Browser console | No errors or warnings |
| Browser storage | `localStorage` and `sessionStorage` empty; the session cookie is not readable from JavaScript |
| Ports | Client 5174, API 4000, `GET /api/health` 200 |

## Verification Status (Phase 8)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Schema change needed | None (no Phase 8 migration) |
| `npm run test:security` | Passed (20 tests) |
| `npm test` | Passed — client 82, server 202 (284 total) |
| `npm run typecheck` | Passed |
| `npm run test:coverage` | Passed — client 93.3% lines, server 95.6% lines |
| `npm run build` | Passed |
| `docker compose config` | **Not run — Docker is not installed on this machine** |
| Docker image build / container runtime | **Not run — manually pending** |
| `docker-compose.yml` and `ci.yml` parse as YAML, required keys present | Passed (static check) |
| Manual: frontend 5174, backend 4000, `GET /api/health` public | 200 / 200 / 200 |
| Manual: response headers | `X-Powered-By` absent; `X-Content-Type-Options`, `X-Frame-Options`, HSTS present |
| Manual: mutation with `Origin: http://evil.example` | 403 `INVALID_ORIGIN` |
| Manual: mutation with `Origin: http://localhost:5174` | 200, login succeeds |
| Manual: 200kb JSON body | 413 `PAYLOAD_TOO_LARGE` |
| Manual: 12 wrong logins in a row | 9 × 401, then 429 `RATE_LIMITED` |
| Manual: blocked known vs unknown email | Identical status and body |
| Manual: session cookie | `HttpOnly`, `SameSite=Lax`, `Path=/`, token not in the response body |
| Manual: protected route without a cookie | 401 |
| Manual: dashboard with a session after the changes | 200 |
| Manual: development database reset | Not performed |

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
- One dark theme only: there is no light mode and no theme switch, so the
  interface ignores `prefers-color-scheme: light`.
- The breadcrumb on the issue-creation and project-activity pages still says
  the literal "Project" instead of the project key, because neither page loads
  the project itself. The tab bar above it carries the real navigation.
- The visual pass was verified in one Chromium engine at four widths. Safari
  and Firefox, and real touch devices, have not been checked.
- Drag-and-drop was exercised through the accessible move control, not with a
  real pointer drag; `@dnd-kit`'s pointer path is unchanged from Phase 6 and is
  covered by that phase's tests.
- No visual regression testing: the tests assert structure, roles and wording,
  never pixels or snapshots.
- **Docker runtime is still unverified.** `docker compose config` now passes
  on this machine, but no image has been built and no container started here,
  so `build`, `up`, the PostgreSQL healthcheck, the migration step, the client
  on 5175 and a React Router refresh inside the container remain **manually
  pending**.
- The rate-limit counter is per process and in memory: it resets on restart and
  is not shared between instances. A multi-instance deployment needs a shared
  store.
- The allowed-origin check is not a CSRF-token flow. It is sufficient for the
  current same-machine topology; TLS, a proxy or a different subdomain changes
  what `SameSite=Lax` covers and must be reviewed in Phase 9.
- No Content-Security-Policy yet. The API returns no documents, so the CSP
  belongs to whatever serves the client HTML — decided together with the
  deployment.
- Coverage has no threshold on purpose. It reports which lines ran, not whether
  the behaviour is right.
- Still open from Phase 3: email verification, password reset, MFA and session
  management (listing and revoking a user's own sessions).
- No lint tooling yet, and no deployment (Phase 9).

## Next Task

**Phase 9B — GitHub, deployment and portfolio preparation.** Commit the Phase
8 and 9A work and push it (nothing has been committed yet), complete the Docker
runtime verification listed above, then choose a host and a managed PostgreSQL
and deploy — revisiting the cookie, CORS, origin and Content-Security-Policy
rules for that real topology. Finally take the screenshots and write the
portfolio material the README still marks as a placeholder.
