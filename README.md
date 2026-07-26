# DevFlow

> **Status: Phase 3 of 10 complete.** The client and server scaffolding runs, the
> PostgreSQL schema exists with migrations and seed data, and email/password
> authentication works with database-backed cookie sessions. There is still no
> API for workspaces, projects or issues — the rest of "Planned Features" is
> unbuilt.

## Project Overview

DevFlow is a full-stack issue and sprint management application for small
software teams. A team creates a workspace, invites members, opens projects,
files tasks and bugs, assigns them to people, moves them across a Kanban board,
discusses them in comments and reviews what changed in an activity feed.

It is built as a portfolio project: a realistic, multi-user, permission-aware
web application rather than a tutorial to-do list.

## Planned Features

Only the first item is implemented.

- [x] User registration and login with HTTP-only cookie sessions
- [ ] Workspaces with member invitations and roles (owner, admin, member)
- [ ] Projects inside a workspace
- [ ] Issues typed as task or bug, with priority and status
- [ ] Assigning issues to workspace members
- [ ] Kanban board with drag-and-drop status changes
- [ ] Comments on issues
- [ ] Activity history for every issue change
- [ ] Filtering by status, type and assignee, plus free-text search
- [ ] Pagination and sorting on issue lists
- [ ] Responsive interface

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
| 5 | Projects and issues | Not started |
| 6 | Comments, activity and Kanban | Not started |
| 7 | Frontend integration | Not started |
| 8 | Testing, Docker, CI and security | Not started |
| 9 | UI/UX, deployment and portfolio preparation | Not started |

Full phase details: [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Status

Phase 4 — Workspaces and membership is complete. What exists today:

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
- 65 passing tests: 20 client tests and 45 server tests (the authentication and
  workspace integration tests need the dedicated test database)

Not built yet: project and issue APIs, comments, activity feed, Kanban, the
final UI, Docker and CI.

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

### Test database

The authentication and workspace tests write and delete rows, so they use a
**separate** database, never the development one:

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

`npm test` includes the authentication and workspace integration tests, which need
`server/.env.test` and `npm run db:test:prepare` (see "Test database" above).

```bash
npm run build
```

## Screenshots

_Placeholder — screenshots will be added in Phase 9, when there is a working
interface to show._

## Live Demo

_Placeholder — a public demo instance and a demo account will be added in
Phase 9._
