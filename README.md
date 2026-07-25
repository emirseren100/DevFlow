# DevFlow

> **Status: Phase 1 of 10 complete.** The client and server scaffolding runs,
> but no product feature exists yet. There is no database, no authentication
> and no issue tracking. Everything in "Planned Features" is still unbuilt.

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
| 2 | Database and Prisma | Next |
| 3 | Authentication and authorization | Not started |
| 4 | Workspaces and membership | Not started |
| 5 | Projects and issues | Not started |
| 6 | Comments, activity and Kanban | Not started |
| 7 | Frontend integration | Not started |
| 8 | Testing, Docker, CI and security | Not started |
| 9 | UI/UX, deployment and portfolio preparation | Not started |

Full phase details: [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Status

Phase 1 — Client and Server Scaffolding is complete. What exists today:

- npm workspaces root with `client` and `server`
- React + TypeScript client on port **5174** with placeholder routes
  (`/`, `/login`, `/register`, `/app`)
- Express + TypeScript API on port **4000** with `GET /api/health`, a shared
  404 response and a central error handler
- CORS configured for `http://localhost:5174`
- 5 passing tests: a client shell smoke test and Supertest API tests

Not built yet: database, Prisma, authentication, workspaces, projects, issues,
comments, activity, Kanban, Docker and CI.

Current state at any time: [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md).

## Local Setup

### Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer

No database is required at this stage.

### Install

```bash
npm install
```

Optionally copy the environment examples (defaults already match them):

```bash
cp client/.env.example client/.env && cp server/.env.example server/.env
```

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
