# DevFlow

> **Status: Phase 2 of 10 complete.** The client and server scaffolding runs and
> the PostgreSQL schema exists with migrations and seed data. There is still no
> authentication and no API for workspaces, projects or issues — everything in
> "Planned Features" is unbuilt.

## Project Overview

DevFlow is a full-stack issue and sprint management application for small
software teams. A team creates a workspace, invites members, opens projects,
files tasks and bugs, assigns them to people, moves them across a Kanban board,
discusses them in comments and reviews what changed in an activity feed.

It is built as a portfolio project: a realistic, multi-user, permission-aware
web application rather than a tutorial to-do list.

## Planned Features

None of these are implemented yet.

- [ ] User registration and login with HTTP-only cookie sessions
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
| 3 | Authentication and authorization | Next |
| 4 | Workspaces and membership | Not started |
| 5 | Projects and issues | Not started |
| 6 | Comments, activity and Kanban | Not started |
| 7 | Frontend integration | Not started |
| 8 | Testing, Docker, CI and security | Not started |
| 9 | UI/UX, deployment and portfolio preparation | Not started |

Full phase details: [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Status

Phase 2 — Database and Prisma is complete. What exists today:

- npm workspaces root with `client` and `server`
- React + TypeScript client on port **5174** with placeholder routes
  (`/`, `/login`, `/register`, `/app`)
- Express + TypeScript API on port **4000** with `GET /api/health`, a shared
  404 response and a central error handler
- CORS configured for `http://localhost:5174`
- PostgreSQL schema through Prisma 7: User, Workspace, WorkspaceMember,
  Project, Sprint, Issue, Comment, ActivityLog — with an applied initial
  migration, an idempotent seed and a read-only database check
- 5 passing tests: a client shell smoke test and Supertest API tests, none of
  which require a database

Not built yet: authentication, workspace/project/issue APIs, comments,
activity feed, Kanban, client data integration, Docker and CI.

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
`npm run db:generate`, `npm run db:status`.

The seed is idempotent — running it again updates the same rows instead of
creating duplicates.

> **Warning:** `prisma migrate reset` (and any other reset command) **drops the
> database and destroys all local development data**. It is not part of any npm
> script here on purpose. Only run it manually, and only against a disposable
> local development database.

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

```bash
npm run build
```

## Screenshots

_Placeholder — screenshots will be added in Phase 9, when there is a working
interface to show._

## Live Demo

_Placeholder — a public demo instance and a demo account will be added in
Phase 9._
