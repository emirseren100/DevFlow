# DevFlow

> **Status: Phase 9A of 10 complete.** The product is feature complete and now
> has its visual identity: a dark application shell with one emerald accent, a
> shared component and token set, and a responsive, keyboard-usable interface
> verified in a browser at 1440, 1024, 768 and 390 pixels. What remains is
> Phase 9B — GitHub, deployment and portfolio preparation. Nothing is deployed.

## Project Overview

DevFlow is a full-stack issue and sprint management application for small
software teams. A team creates a workspace, invites members, opens projects,
files tasks and bugs, assigns them to people, moves them across a Kanban board,
discusses them in comments and reviews what changed in an activity feed.

It is built as a portfolio project: a realistic, multi-user, permission-aware
web application rather than a tutorial to-do list.

## Features

- [x] User registration and login with HTTP-only cookie sessions
- [x] Workspaces with member management and roles (owner, admin, member)
- [x] Projects inside a workspace
- [x] Issues typed as task or bug, with priority and status
- [x] Assigning issues to workspace members
- [x] Kanban board with drag-and-drop status changes
- [x] Comments on issues
- [x] Activity history for every issue change
- [x] Filtering by status, type and assignee, plus free-text search
- [x] Pagination and sorting on issue lists
- [x] Responsive interface

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | HTTP-only cookie sessions |
| Testing | Vitest, React Testing Library, Supertest |
| Infrastructure | Docker Compose, GitHub Actions |
| Package manager | npm |

## Planned Architecture

A monolithic application split into two parts in one repository:

```
DevFlow/
├── client/     React SPA — talks only to the REST API
├── server/     Express REST API — the only part touching the database
├── docs/       architecture, roadmap, decisions, state, learning log
└── docker-compose.yml   local PostgreSQL
```

- The client sends requests with `credentials: "include"`; the session cookie
  is attached by the browser and is not readable by JavaScript.
- Express validates every request body, parameter and query with Zod, then
  checks authentication (401) and workspace-level authorization (403).
- Prisma is the only database access layer; migrations are committed to git.
- Every response uses one shape: `{ success: true, data }` or
  `{ success: false, error }`.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Development Roadmap

| Phase | Title | Status |
|---|---|---|
| 0 | Project foundation | Complete |
| 1 | Client and server scaffolding | Complete |
| 2 | Database and Prisma | Complete |
| 3 | Authentication and authorization | Complete |
| 4 | Workspaces and membership | Complete |
| 5 | Projects and issues | Complete |
| 6 | Comments, activity and Kanban | Complete |
| 7 | Frontend integration | Complete |
| 8 | Testing, Docker, CI and security | Complete |
| 9A | Final UI/UX and browser QA | Complete |
| 9B | GitHub, deployment and portfolio preparation | Not started |

Full phase details: [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Status

Phase 9A — final UI/UX and browser QA is complete. What exists today:

- npm workspaces root with `client` and `server`
- React + TypeScript client on port **5174**: working `/login` and `/register`
  forms, a session-protected `/app` area, and workspace list and detail pages
- Express + TypeScript API on port **4000** with `GET /api/health` (public), a
  shared 404 response and a central error handler
- CORS configured for `http://localhost:5174` with `credentials: true`
- PostgreSQL schema through Prisma 7: User, PasswordCredential, Session,
  Workspace, WorkspaceMember, Project, Sprint, Issue, Comment, ActivityLog —
  with applied migrations, an idempotent seed and a read-only database check
- Email/password authentication: Argon2id hashes, opaque session tokens stored
  as SHA-256 hashes, HTTP-only session cookie, `requireAuth` middleware
- Workspace and membership API with `OWNER`/`ADMIN`/`MEMBER` roles checked
  against PostgreSQL on every request
- Project, sprint and issue API nested under a workspace, with project-scoped
  issue numbers (`API-1`, `API-2`, …) handed out inside a transaction
- Client pages for the project list, project detail with issue filters and
  pagination, issue creation and issue detail
- Plain-text issue comments with author-only editing and moderated deletion
- Project and issue activity feeds read from the `ActivityLog` rows the API
  writes, paginated and scoped to one project
- A Kanban board with five status columns, drag-and-drop through `@dnd-kit`, an
  accessible non-drag move control, and server-owned ordering inside one
  PostgreSQL transaction
- One authenticated application shell around every protected page: brand link,
  workspace switcher, workspace navigation, current user and sign out
- A workspace dashboard at `/app/workspaces/:workspaceId/dashboard`, served by a
  single aggregation endpoint
- TanStack Query as the one server-state layer, with centralized query keys and
  targeted invalidation after every mutation
- Shared loading, empty and error states, including dedicated 403 and 404
  experiences
- Zod-validated server environment, Helmet security headers, a 100kb JSON body
  limit, login/register rate limiting and an allowed-origin check on every
  state-changing request
- Multi-stage Dockerfiles for both sides and a Docker Compose stack
  (PostgreSQL + API + nginx-served client) with a database healthcheck
- A GitHub Actions workflow that validates the schema, applies migrations to a
  disposable PostgreSQL service, typechecks, tests and builds
- One visual system in `client/src/index.css`: colour, spacing, radius, focus
  and type tokens at the top, then the browser elements the application uses,
  then the repeated blocks — a dark charcoal shell with a single emerald accent,
  no UI framework and no CSS-in-JS
- Shared interface pieces: application shell, workspace switcher and navigation,
  breadcrumbs, page header, project tabs, status/priority/type/role badges,
  metric cards, record lists, filter bars, pagination, a modal confirmation
  dialog and one loading, empty, error and permission state each
- 291 passing tests: 89 client tests and 202 server tests (the authentication,
  workspace, project, sprint, issue, comment, activity, Kanban, dashboard and
  security integration tests need the dedicated test database)

Not built yet: realtime updates, notifications, attachments, labels, subtasks
and any deployment.

Current state at any time: [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md).

## Local Setup

### Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- A PostgreSQL database for the database commands (the app itself and the test
  suite still run without one)

If you have no local PostgreSQL, `npx prisma dev --name devflow` starts a
disposable local server and prints the URLs to paste into `server/.env`.

### Install

```bash
npm install
```

Copy the environment examples:

```bash
cp client/.env.example client/.env && cp server/.env.example server/.env
```

Then set `DATABASE_URL` in `server/.env`, for example:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devflow?schema=public
```

### Database

Apply the migrations, load development data and verify the result:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run db:check
```

Browse the data with Prisma Studio (manual tool, not part of verification):

```bash
npm run db:studio
```

Other database commands: `npm run db:validate`, `npm run db:format`,
`npm run db:generate`, `npm run db:status`, `npm run db:test:prepare`.

The seed is idempotent — running it again updates the same rows instead of
creating duplicates.

> **Warning:** `prisma migrate reset` (and any other reset command) **drops the
> database and destroys all local development data**. It is not part of any npm
> script here on purpose. Only run it manually, and only against a disposable
> local development database.

### Authentication

Environment variables read by the server (see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `production` turns on the `Secure` cookie flag |
| `PORT` | API port, `4000` |
| `CLIENT_ORIGIN` | the single allowed CORS origin, `http://localhost:5174` |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_COOKIE_NAME` | cookie holding the session token, `devflow_session` |
| `SESSION_TTL_DAYS` | session and cookie lifetime, `7` |

No secret key is needed: session tokens are random values stored as hashes, so
there is nothing to sign.

Endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | create an account, start a session |
| `POST /api/auth/login` | start a session |
| `POST /api/auth/logout` | delete the session, clear the cookie |
| `GET /api/auth/me` | current user, `401` without a valid session |

Client routes: `/register` and `/login` are for signed-out visitors, `/app`
requires a session and redirects guests to `/login`.

#### Development-only seed login

`npm run db:seed` gives every seeded account the same password:

```
email:    ada@devflow.local
password: DevFlow123!
```

The other seeded accounts are `boris@devflow.local` and `ceyda@devflow.local`.

> **These credentials are for local development only.** They are fictional
> accounts on a disposable database and must never exist in a deployed
> environment.

### Workspaces and membership

Every endpoint below requires a valid session (`401 UNAUTHENTICATED` without
one) and re-checks membership and role in PostgreSQL (`403 FORBIDDEN` when the
role is not enough).

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET /api/workspaces` | any member | workspaces the current user belongs to, with their role and member count |
| `POST /api/workspaces` | any user | create a workspace; the creator becomes its `OWNER` |
| `GET /api/workspaces/:workspaceId` | member | workspace details, own role, member count, owner |
| `PATCH /api/workspaces/:workspaceId` | `OWNER`, `ADMIN` | rename the workspace (the slug does not change) |
| `DELETE /api/workspaces/:workspaceId` | `OWNER` | delete the workspace and its memberships |
| `GET /api/workspaces/:workspaceId/members` | member | members ordered `OWNER`, `ADMIN`, `MEMBER`, then join date |
| `POST /api/workspaces/:workspaceId/members` | `OWNER`, `ADMIN` | add an existing user by email |
| `PATCH /api/workspaces/:workspaceId/members/:memberId` | `OWNER` | change a member between `ADMIN` and `MEMBER` |
| `DELETE /api/workspaces/:workspaceId/members/:memberId` | `OWNER`, `ADMIN` | remove a member |

**Roles**

- `OWNER` — the creator. One per workspace, and it never changes: the owner
  membership cannot be demoted, removed, or duplicated, and ownership cannot be
  transferred yet.
- `ADMIN` — helps run the workspace: rename it, add members, remove members.
- `MEMBER` — read access to the workspace and its member list.

**Permission summary**

| Action | `OWNER` | `ADMIN` | `MEMBER` |
|---|---|---|---|
| View workspace and members | yes | yes | yes |
| Rename workspace | yes | yes | no |
| Delete workspace | yes | no | no |
| Add a `MEMBER` | yes | yes | no |
| Add an `ADMIN` | yes | no | no |
| Change roles | yes | no | no |
| Remove a `MEMBER` | yes | yes | no |
| Remove an `ADMIN` | yes | no | no |
| Touch the `OWNER` membership | no | no | no |

**Limitation: only registered users can be added.** There are no email
invitations in this phase. An email with no DevFlow account returns
`404 USER_NOT_FOUND`, and the person must register first. Leaving a workspace
yourself is not implemented either: `DELETE .../members/:memberId` rejects
self-removal with `403 SELF_REMOVAL_NOT_ALLOWED`.

Error codes: `VALIDATION_ERROR` (400), `INVALID_ROLE` (400),
`UNAUTHENTICATED` (401), `FORBIDDEN` (403), `OWNER_MEMBERSHIP_IMMUTABLE` (403),
`SELF_REMOVAL_NOT_ALLOWED` (403), `WORKSPACE_NOT_FOUND` (404),
`MEMBER_NOT_FOUND` (404), `USER_NOT_FOUND` (404), `ALREADY_MEMBER` (409).

Client routes: `/app` redirects to `/app/workspaces` (list and create),
`/app/workspaces/:workspaceId` shows one workspace with its members. Controls
that the current role may not use are hidden — the server enforces the rules
regardless.

**Manual test**

1. `npm run dev`, then register two accounts at http://localhost:5174/register.
2. As the first account, create a workspace on `/app/workspaces`; you land on
   its detail page as `OWNER`.
3. Add the second account by email with the role `MEMBER`.
4. Sign in as the second account: the workspace is listed, the detail page shows
   no rename form, no add-member form and no delete button.
5. Still as the second account, send a forbidden request by hand — the server
   answers `403` even though the button was never shown:

```bash
curl -i -X PATCH http://localhost:4000/api/workspaces/<id> -H "Content-Type: application/json" -b "devflow_session=<cookie>" -d "{\"name\":\"Hacked\"}"
```

6. Without any cookie, `curl -i http://localhost:4000/api/workspaces` returns
   `401`, while `curl -i http://localhost:4000/api/health` stays public.

### Projects, sprints and issues

Every endpoint below requires a valid session and a membership in the workspace
named in the URL. The project id is always checked against that workspace, so
changing the workspace id in the address bar returns `404 PROJECT_NOT_FOUND`
instead of somebody else's project.

**Projects**

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET /api/workspaces/:workspaceId/projects` | member | list with `status`, `search`, `sort` (`createdAt`, `updatedAt`, `name`) and `order` |
| `POST /api/workspaces/:workspaceId/projects` | `OWNER`, `ADMIN` | create a project; the key is uppercased |
| `GET /api/workspaces/:workspaceId/projects/:projectId` | member | details, own role, issue counts by status, sprints, creator |
| `PATCH /api/workspaces/:workspaceId/projects/:projectId` | `OWNER`, `ADMIN` | change `name`, `description` or `status` |
| `DELETE /api/workspaces/:workspaceId/projects/:projectId` | `OWNER`, `ADMIN` | permanent delete, requires `{ "confirm": true }` |

**Sprints** (all nested under a project)

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET .../projects/:projectId/sprints` | member | sprints ordered `ACTIVE`, `PLANNED`, `COMPLETED`, then start date |
| `POST .../projects/:projectId/sprints` | `OWNER`, `ADMIN` | create a sprint |
| `PATCH .../projects/:projectId/sprints/:sprintId` | `OWNER`, `ADMIN` | change name, goal, status or dates |
| `DELETE .../projects/:projectId/sprints/:sprintId` | `OWNER`, `ADMIN` | only when the sprint holds no issue |

**Issues** (all nested under a project)

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET .../projects/:projectId/issues` | member | filtered, paginated issue list |
| `POST .../projects/:projectId/issues` | any member | create an issue; the reporter is always the signed-in user |
| `GET .../projects/:projectId/issues/:issueId` | member | issue details and what the caller may do with it |
| `PATCH .../projects/:projectId/issues/:issueId` | `OWNER`, `ADMIN`, reporter, assignee | change the editable fields |
| `DELETE .../projects/:projectId/issues/:issueId` | `OWNER`, `ADMIN` | permanent delete |

**Issue keys.** A project has a key of 2–10 uppercase letters and digits that is
unique inside its workspace and cannot be changed after creation. Every project
keeps its own counter, so its first issue is number 1 and the readable key is
built as `KEY-number` (`API-1`, `WEB-14`). The number is allocated by
incrementing the project counter inside the same transaction that creates the
issue, and a unique index on `(projectId, number)` is the final guarantee.

**Assignees and sprints.** An assignee must be a current member of the issue's
workspace, and a sprint must belong to the same project. Both are checked in the
database, so a hand-made request cannot assign an unrelated user
(`400 INVALID_ASSIGNEE`) or a foreign sprint (`400 INVALID_SPRINT`).

**Permission summary**

| Action | `OWNER` | `ADMIN` | `MEMBER` |
|---|---|---|---|
| View projects, sprints and issues | yes | yes | yes |
| Create, update, archive, delete a project | yes | yes | no |
| Create, update, delete a sprint | yes | yes | no |
| Create an issue | yes | yes | yes |
| Update any issue | yes | yes | no |
| Update an issue they report or are assigned | yes | yes | yes |
| Delete an issue | yes | yes | no |

**Issue filters and pagination.** `GET .../issues` accepts `search`, `status`,
`type`, `priority`, `assigneeId`, `reporterId`, `sprintId`, `unassigned`,
`page`, `limit`, `sort` (`number`, `createdAt`, `updatedAt`, `priority`,
`dueDate`) and `order`. The defaults are page 1, 20 per page (100 maximum),
sorted by `updatedAt` descending. `search` matches the title, the description
and the issue number, so `API-14`, `14` and part of a title all work. The
response carries `issues`, `pagination` and the `filters` that are actually in
use. An unsupported sort field returns `400 INVALID_SORT`; any other bad filter
value returns `400 INVALID_FILTER`.

New error codes: `PROJECT_NOT_FOUND` (404), `PROJECT_KEY_IN_USE` (409),
`SPRINT_NOT_FOUND` (404), `SPRINT_HAS_ISSUES` (409), `ISSUE_NOT_FOUND` (404),
`INVALID_ASSIGNEE` (400), `INVALID_SPRINT` (400), `INVALID_DATE_RANGE` (400),
`INVALID_FILTER` (400), `INVALID_SORT` (400).

Client routes: `/app/workspaces/:workspaceId/projects` (list, filters, create
form for `OWNER` and `ADMIN`), `.../projects/:projectId` (detail, sprints, issue
list with URL-synchronised filters and pagination, project settings),
`.../projects/:projectId/issues/new` and `.../projects/:projectId/issues/:issueId`
(detail with an inline edit form when the server allows it).

**Deletion is permanent.** This local MVP has no soft delete and no undo:
deleting a project removes its sprints, its issues and their comments; deleting
an issue removes its comments. Users, memberships and the workspace itself are
never touched.

### Comments, activity and the Kanban board

Every endpoint below requires a valid session and a membership in the workspace
named in the URL. The chain is always re-checked in PostgreSQL: the project must
belong to the workspace, the issue must belong to the project, and a comment must
belong to that issue.

**Comments** (plain text, no Markdown, no HTML, no mentions, no attachments)

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET .../issues/:issueId/comments` | member | all comments, oldest first, each with `isEdited` and the caller's `canEdit` / `canDelete` |
| `POST .../issues/:issueId/comments` | any member | add a comment; the author is always the signed-in user |
| `PATCH .../issues/:issueId/comments/:commentId` | the author only | change the body |
| `DELETE .../issues/:issueId/comments/:commentId` | the author, `OWNER`, `ADMIN` | delete the comment (never the issue) |

A body is trimmed first, then must be 1–5000 characters, so a whitespace-only
comment returns `400 VALIDATION_ERROR`. Editing is the author's own voice: an
`OWNER` or an `ADMIN` may **delete** somebody else's comment but never rewrite
it. A comment id from another issue returns `404 COMMENT_NOT_FOUND`.

**Activity**

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET .../projects/:projectId/activities` | member | project feed, newest first |
| `GET .../projects/:projectId/issues/:issueId/activities` | member | history of one issue |

Both accept `page`, `limit` (default 20, maximum 100) and an optional `type`, and
both return `activities` plus the same `pagination` metadata as the issue list.
Rows are ordered by `createdAt` descending with the id as the tie-breaker. Each
row carries the type, a safe actor (`id`, `name`, `email`, or `null` for a future
system action), the project, the issue summary with its display key, and
whitelisted metadata only — the sentence itself ("Ada moved API-2 from To Do to
In Progress") is generated in the client, never stored.

Activity is written for meaningful state changes only: `WORKSPACE_CREATED`,
`MEMBER_ADDED`, `PROJECT_CREATED`, `ISSUE_CREATED`, `ISSUE_UPDATED`,
`ISSUE_STATUS_CHANGED`, `ISSUE_ASSIGNED`, `COMMENT_CREATED`. Reads, filters and
failed validations are never logged.

**Kanban board**

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET .../projects/:projectId/board` | member | the five columns in board order, each with its cards |
| `PATCH .../projects/:projectId/issues/:issueId/move` | `OWNER`, `ADMIN`, reporter, assignee | change status and position |

The board is one query. A card carries only summary data — display key, title,
type, priority, status, position, assignee, reporter, sprint, due date and the
`canMove` / `canEdit` flags — never the description or the comments.

The move body is exactly two fields:

```json
{ "targetStatus": "IN_PROGRESS", "targetIndex": 0 }
```

**Movement permissions.** `OWNER` and `ADMIN` may move any issue. A `MEMBER` may
move only an issue they reported or are assigned to; an unrelated member sees the
card but gets `403 FORBIDDEN`. The client hides the drag handle when `canMove` is
false, which is convenience, not protection — the server checks the row again.

**Ordering.** `Issue.position` is a column-local integer: every status column is
`0, 1, 2, …`. The server reads the real order, inserts the card at the requested
index, renumbers both affected columns and writes everything in one serializable
transaction, retried a bounded number of times on a write conflict. A negative
`targetIndex` is rejected with `400 VALIDATION_ERROR`; an index past the end of
the destination column is **clamped** to the end. The response is the confirmed
board, so the client renders the server's result instead of its own guess, and a
failed move rolls back to the previous board. Moving to a different column writes
one `ISSUE_STATUS_CHANGED` row; reordering inside one column writes none.

New error code: `COMMENT_NOT_FOUND` (404).

Client routes: `.../projects/:projectId/board` (Kanban board),
`.../projects/:projectId/activity` (project feed), and the issue detail page now
also shows the comment section and the issue history. Every project page links
between **Issues**, **Board** and **Activity**.

**Manual test**

1. `npm run db:seed`, `npm run dev`, then sign in as `ada@devflow.local`.
2. Open a project, then **Board**: the seeded issues appear in their five
   columns in position order.
3. Drag a card to another column, or use its "Move … to" select. The card stays
   where the server put it and the columns stay contiguous after a reload.
4. Open an issue, add a comment, edit it, and delete it after the confirmation.
5. Open **Activity**: the created issue, the status change and the comment appear
   as readable sentences.
6. Sign in as `ceyda@devflow.local` (`MEMBER`) and open the board: cards she
   neither reported nor is assigned to have no drag handle and no move control.
   A hand-made request is still rejected:

```bash
curl -i -X PATCH http://localhost:4000/api/workspaces/<ws>/projects/<prj>/issues/<issue>/move -H "Content-Type: application/json" -b "devflow_session=<cookie>" -d "{\"targetStatus\":\"DONE\",\"targetIndex\":0}"
```

Realtime updates are **not** implemented: another person's move appears after a
reload. There are no notifications and no emails.

**Manual test**

1. `npm run db:seed`, then `npm run dev` and sign in as `ada@devflow.local`
   (see the development seed login above).
2. Open the workspace, follow **Projects**, and create a project with the key
   `web` — it is stored as `WEB`.
3. Create an issue in it: the detail page shows `WEB-1`. Create a second one to
   see `WEB-2`.
4. Filter the issue list by status; the URL gains `?status=…`, and reloading the
   page restores the same view.
5. Sign in as `ceyda@devflow.local` (a `MEMBER`): no create-project form, no
   project settings, and no delete button on an issue somebody else reported.
6. Still as that member, try the same change by hand — the server answers `403`:

```bash
curl -i -X PATCH http://localhost:4000/api/workspaces/<workspaceId>/projects/<projectId> -H "Content-Type: application/json" -b "devflow_session=<cookie>" -d "{\"name\":\"Hacked\"}"
```

### The application shell, routing and the workspace dashboard

Everything behind `/app` is drawn inside one shell (`client/src/layouts/AppShell.tsx`):
the DevFlow brand, the workspace switcher, the workspace navigation, the current
user and a sign out button. Pages render only their own content, so no screen
repeats the frame around itself, and the page always has exactly one `<main>`
landmark and one `<h1>`.

**Authenticated routes**

| Route | Page |
|---|---|
| `/app` | redirects to `/app/workspaces` |
| `/app/workspaces` | the workspaces you belong to, plus the create form |
| `/app/workspaces/:workspaceId` | redirects to that workspace's overview |
| `/app/workspaces/:workspaceId/dashboard` | workspace overview (the dashboard) |
| `/app/workspaces/:workspaceId/members` | member management |
| `/app/workspaces/:workspaceId/settings` | rename and delete the workspace |
| `/app/workspaces/:workspaceId/projects` | project list and create form |
| `.../projects/:projectId` | project detail with URL issue filters |
| `.../projects/:projectId/board` | Kanban board |
| `.../projects/:projectId/activity` | project activity feed |
| `.../projects/:projectId/issues/new` | new issue in that project |
| `.../projects/:projectId/issues/:issueId` | issue detail, comments and history |

The workspace switcher lists only the workspaces `GET /api/workspaces` returns
for the signed-in user, so it cannot even name one they cannot open. Nothing
about the selection is written to browser storage: the URL already says which
workspace is open.

**Dashboard endpoint**

| Endpoint | Allowed | Purpose |
|---|---|---|
| `GET /api/workspaces/:workspaceId/dashboard` | every member | one aggregated overview of the workspace |

It answers `401` without a session, `403` for a non-member and `404` for an
unknown workspace, exactly like the other workspace routes. The response carries
the workspace summary (member count, active and archived project counts, your
role), the issue metrics (open, assigned to you, overdue, unassigned), the full
status and priority distributions including zeros, about five recently updated
issues and about eight recent activity rows. Counts are computed with Prisma
`count` and `groupBy` in PostgreSQL, so the browser never downloads issues in
order to count them, and no issue description ever reaches the dashboard.

`DONE` counts as closed. An issue is overdue when its `dueDate` is before the
**server's** current time and its status is not `DONE`; a date sent by the
browser is never read. Timestamps stay ISO strings on the wire, and the client
formats them for display.

**TanStack Query**

`@tanstack/react-query` is the only server-state layer. One `QueryClient` is
created near the application root, with conservative defaults: no automatic
retry, no refetch on window focus, and a 30-second `staleTime`. Every error
state offers a visible **Try again** button instead, and a `401` clears the
signed-in user so the route guard sends the browser to the login page.

Every key comes from `client/src/lib/queryKeys.ts`; no component writes a key by
hand. After a mutation only the affected keys are invalidated — adding a member
refreshes the member list, the workspace and the dashboard, and a Kanban move
refreshes the board plus, when the status actually changed, the issue, the
project lists, the feeds and the dashboard metrics.

Issue filters still live in the URL query string and are part of the query key,
so back, forward, reload and a shared link all restore the same list.

**Manual walk-through**

1. Sign in as `ada@devflow.local` and land on `/app/workspaces`.
2. Open a workspace: the URL becomes `.../dashboard` and the shell shows the
   workspace switcher and the Overview / Projects / Members / Settings links.
3. Compare the summary cards with the seed data, then follow a recent issue link
   — it opens the nested issue detail of the right project.
4. Create a project from **Projects** and go back to the overview: the active
   project count has been refreshed.
5. Move a card on the board and reload the dashboard: the status distribution
   follows.
6. Sign in as `ceyda@devflow.local` (a `MEMBER`): no **Create a project** action
   and no **Settings** link, and the server still refuses the request itself.
7. Narrow the window to about 390px: the navigation collapses behind the
   **Menu** button, the cards wrap and the board scrolls sideways.

### Security middleware

Every response passes the same chain, in this order:

1. **Helmet** - standard security headers (`X-Content-Type-Options`,
   `X-Frame-Options`, HSTS and friends) and `X-Powered-By` removed, so the
   response does not advertise the stack. `Content-Security-Policy` is switched
   off here on purpose: this process only answers JSON, and a CSP protects a
   *document*. The one that matters belongs to whatever serves the client - the
   nginx container, and the deployment phase.
2. **CORS** - one explicitly configured origin, `credentials: true`, never `*`
   (a wildcard is not even allowed together with credentials).
3. **JSON body limit** - `100kb`. A 10 000-character issue description is about
   10kb, so normal content is unaffected; anything larger is refused with
   `413 PAYLOAD_TOO_LARGE`, and a body that is not JSON with
   `400 MALFORMED_JSON`.
4. **Allowed-origin check** - `POST`, `PUT`, `PATCH` and `DELETE` must carry an
   `Origin` header equal to `CLIENT_ORIGIN`, or the request is refused with
   `403 INVALID_ORIGIN`. `GET`, `HEAD` and `OPTIONS` are never blocked, so the
   CORS preflight still works.
5. **Auth rate limit** - only `POST /api/auth/login` and
   `POST /api/auth/register`: 10 attempts per IP per 15 minutes by default,
   then `429 RATE_LIMITED`. The message is identical for a known and an unknown
   email, so the limiter never becomes a way to discover accounts.

A missing `Origin` on a mutation is accepted outside production, because a
browser always sends the header on those methods and page JavaScript cannot
forge it - a request without it is `curl`, a test agent or a development
script. In production it is refused. This is not a CSRF-token framework, and
the deployment topology has to be reviewed again in the deployment phase,
because it changes what `SameSite=Lax` protects.

Unexpected failures always answer `500 INTERNAL_ERROR` with one fixed sentence.
No stack trace, Prisma message, file path or environment value ever reaches a
client; the detail stays in the server log.

### Environment validation

`server/src/config.ts` parses `process.env` with Zod once, at startup. `PORT`
and `SESSION_TTL_DAYS` become numbers, `NODE_ENV` may only be `development`,
`test` or `production`, `CLIENT_ORIGIN` must be an absolute http(s) origin, and
`DATABASE_URL` has no default at all. A mistake stops the process immediately
with a list of variable names and the rule each one broke - never the value, so
the database password is never printed.

The client reads its configuration in one place too (`client/src/lib/env.ts`).
Only `VITE_`-prefixed variables reach the browser bundle, and everything that
does is public, so no secret may ever be put there. The client needs none: the
session is an HTTP-only cookie the browser manages.

### Docker development

Docker is an alternative to the local setup above, not a replacement. It runs
PostgreSQL, the API and the built client as three containers:

```
Client container (nginx :80)  ->  Server container (:4000)  ->  PostgreSQL container (:5432)
```

```bash
cp .env.docker.example .env.docker
```

```bash
docker compose --env-file .env.docker build
```

```bash
docker compose --env-file .env.docker up
```

| What | Where |
|---|---|
| Client in Docker | http://localhost:5175 |
| Client with `npm run dev` | http://localhost:5174 |
| API (both setups) | http://localhost:4000 |
| PostgreSQL from the host | `localhost:5433` |
| PostgreSQL inside Compose | `postgres:5432` |

The two client ports are deliberately different, so the Docker stack and a
local `npm run dev` can run at the same time. The database is published on 5433
for the same reason: an installed PostgreSQL keeps 5432.

The server container applies the migration history with `prisma migrate deploy`
before it starts, and waits for the database healthcheck first. It never runs
`prisma migrate dev` and never runs the development seed.

Stopping the stack keeps the data:

```bash
docker compose down
```

**Destructive.** This also deletes the named volume, and with it every row in
the Docker PostgreSQL - accounts, workspaces, projects and issues:

```bash
docker compose down -v
```

The credentials in `.env.docker.example` are development-only. They exist so a
container can talk to a container on one laptop and are committed as an example
on purpose; a real deployment must use secrets that never live in a file.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on every push to
`main`. It starts a disposable PostgreSQL service container named
`devflow_test`, then runs the same npm scripts a developer runs locally, in
order: `npm ci`, `db:validate`, `db:generate`, `db:deploy`, `typecheck`, `test`,
`build`. Any failing step fails the job - nothing is marked
`continue-on-error`. The workflow verifies; it does not deploy.

### Test database

The authentication, workspace, project, sprint and issue tests write and delete
rows, so they use a **separate** database, never the development one:

```bash
cp server/.env.test.example server/.env.test
```

Set `DATABASE_URL` in `server/.env.test` to a disposable database whose name
contains `devflow_test`. The test setup refuses to run against anything else, so
a mistyped URL cannot touch development data.

Apply the migrations to it:

```bash
npm run db:test:prepare
```

Then run only the authentication tests:

```bash
npm run test:auth
```

Or only the workspace and membership tests:

```bash
npm run test:workspaces
```

The Phase 5 suites have their own scripts as well:

```bash
npm run test:projects
```

```bash
npm run test:sprints
```

```bash
npm run test:issues
```

The Phase 6 suites too:

```bash
npm run test:comments
```

```bash
npm run test:activities
```

```bash
npm run test:kanban
```

**Connection pool.** The local disposable `prisma dev` server drops connections
past a couple, which corrupts requests that run in parallel. `DATABASE_POOL_MAX`
in `server/.env` and `server/.env.test` keeps the pool at `2` on this machine; a
real PostgreSQL server can use `10`.

### Known security limitations

Documented, deliberately **not** implemented in Phase 3:

- no rate limiting on login (brute-force protection)
- no email verification, no password reset
- no multi-factor authentication
- no session or device management screen
- no CSRF token. `SameSite=Lax`, a single allowed origin and JSON-only requests
  are enough for the current same-site local setup, but a cross-site production
  deployment needs this reviewed again in Phase 9.

### Run in development

```bash
npm run dev
```

- Frontend: http://localhost:5174
- Backend health check: http://localhost:4000/api/health

The frontend port is fixed with `strictPort`, so Vite fails loudly instead of
moving to another port and breaking the server's CORS origin.

### Checks

```bash
npm run typecheck
```

```bash
npm test
```

`npm test` runs the client suite and then the server suite. The server
integration tests need `server/.env.test` and `npm run db:test:prepare` (see
"Test database" above); the client tests need no database at all.

Either side can be run on its own:

```bash
npm run test:client
```

```bash
npm run test:server
```

```bash
npm run test:coverage
```

Coverage writes a text summary, an HTML report under `client/coverage` and
`server/coverage`, and an `lcov` file for tooling. It measures which lines the
tests **executed**, not whether the product is correct: a fully covered function
can still be wrong. There is deliberately no percentage threshold to chase.

Migrations against a real database:

```bash
npm run db:deploy
```

`db:deploy` replays the committed migrations with `prisma migrate deploy`. It is
what the container and CI use, because unlike `prisma migrate dev` it never
creates a migration, never asks a question and never resets a database.

```bash
npm run build
```

## Interface

The application ships one dark theme. The whole visual language lives in
`client/src/index.css`:

| Token group | What it decides |
|---|---|
| `--bg`, `--surface`, `--surface-raised`, `--surface-sunken` | The four planes every block sits on |
| `--border`, `--border-strong` | Thin separators; hierarchy comes from the surface, not from shadows |
| `--text`, `--text-muted`, `--text-faint` | Three steps of emphasis, each above 4.5:1 against its surface |
| `--accent`, `--accent-soft` | One emerald, used for the active state and the primary action only |
| `--danger`, `--warning`, `--success`, `--info` | Semantic colours, always paired with a word |
| `--space-1` … `--space-6`, `--radius*`, `--text-xs` … `--text-xl` | Spacing, corners and type sizes |

Two rules keep it consistent: no component invents a colour, and no state is
signalled by colour alone — every badge spells its value out, so the interface
survives a greyscale screen and a screen reader.

## Screenshots

_Placeholder — screenshots will be added in Phase 9B, together with the public
demo._

## Live Demo

_Placeholder — a public demo instance and a demo account will be added in
Phase 9B. Nothing is deployed yet._
