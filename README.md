# DevFlow

**A full-stack issue and sprint tracker for small software teams.** A team
creates a workspace, adds members, opens projects and sprints, files tasks and
bugs, assigns them, moves them across a Kanban board, discusses them in comments
and reviews what changed in an activity feed — all behind role-based
permissions that are checked in the database on every request.

It is a portfolio project: a realistic, multi-user, permission-aware web
application rather than a tutorial to-do list.

React · TypeScript · Express · PostgreSQL · Prisma · Zod · Vitest · Docker ·
GitHub Actions

---

## Live demo

_Not deployed yet._ The repository is prepared for a one-service, same-origin
deployment on Render (see [Production deployment](#production-deployment) and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)). This section will carry the URL once
the service exists.

## Screenshots

_Placeholder._ Screenshots will be taken from the deployed instance: dashboard,
issue list with filters, issue detail with comments, Kanban board, and the
mobile layout.

---

## Features

- Email and password accounts with HTTP-only cookie sessions
- Workspaces with member management and three roles
- Projects inside a workspace, with immutable project keys
- Sprints with planned, active and completed states
- Issues typed as task or bug, with priority, status, assignee, sprint and due
  date
- Per-project issue numbers (`API-1`, `WEB-14`) allocated race-safely
- Filtering by status, type, priority, assignee and sprint, plus free-text
  search, sorting and pagination — all kept in the URL
- Kanban board with drag-and-drop, plus an accessible non-drag move control
- Plain-text comments with author-only editing and moderated deletion
- Project and issue activity feeds
- A workspace dashboard served by one aggregation endpoint
- One dark theme, responsive from 390px up, keyboard-usable throughout

Not built: realtime updates, notifications, email, attachments, labels,
subtasks.

## Roles and permissions

| Action | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| View workspace, members, projects, issues, board, activity | yes | yes | yes |
| Rename workspace | yes | yes | no |
| Delete workspace | yes | no | no |
| Add or remove a MEMBER | yes | yes | no |
| Add or remove an ADMIN | yes | no | no |
| Change roles | yes | no | no |
| Create, update, archive, delete a project | yes | yes | no |
| Create, update, delete a sprint | yes | yes | no |
| Create an issue | yes | yes | yes |
| Update or delete any issue | yes | yes | no |
| Update an issue they reported or are assigned to | yes | yes | yes |
| Comment | yes | yes | yes |
| Edit own comment | yes | yes | yes |
| Delete any comment | yes | yes | own only |
| Move any card on the board | yes | yes | no |
| Move a card they reported or are assigned to | yes | yes | yes |

There is exactly one OWNER per workspace, and that membership cannot be
demoted, removed or duplicated. Controls the current role may not use are hidden
in the UI — and the server re-checks every request regardless, so a hand-made
request gets the same `403`.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router 7, TanStack Query 5 |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL 17 |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Validation | Zod |
| Authentication | Database-backed sessions in an HTTP-only cookie |
| Testing | Vitest, React Testing Library, Supertest |
| Infrastructure | Docker, Docker Compose, GitHub Actions |
| Package manager | npm workspaces |

No UI framework, no CSS-in-JS, no charting library: the visual system is one
hand-written CSS token file.

## Architecture

Two npm workspaces in one repository:

```
DevFlow/
├── client/            React SPA — talks only to the REST API
├── server/            Express REST API — the only part touching the database
├── docs/              architecture, decisions, deployment, interview guide
├── docker-compose.yml local three-container stack
├── Dockerfile.production   the deployment image
└── render.yaml        the deployment blueprint
```

- The client sends every request with `credentials: "include"`; the session
  cookie is attached by the browser and is unreadable by JavaScript.
- Express validates every body, parameter and query with Zod, then checks
  authentication (`401`) and workspace authorization (`403`).
- Prisma is the only database access layer, and migrations are committed.
- Every response has one shape: `{ success: true, data }` or
  `{ success: false, error }`.
- Server state on the client is TanStack Query: one client, centralized query
  keys, and targeted invalidation after each mutation.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Authentication and security

- **Passwords** are hashed with Argon2id (`@node-rs/argon2`).
- **Sessions** are rows in PostgreSQL. The cookie carries a 32-byte random
  token; only its SHA-256 hash is stored, so a database dump contains no usable
  session. Logout deletes the row, so revocation is immediate.
- **The cookie** is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in
  production, with no `Domain`.
- **Origin protection**: `POST`, `PUT`, `PATCH` and `DELETE` must carry an
  `Origin` equal to the single trusted origin — an exact comparison, never a
  wildcard, prefix or substring. Safe methods are never blocked, so the CORS
  preflight still works.
- **Rate limiting** on login and register only: 10 attempts per IP per 15
  minutes, with an identical response for known and unknown emails.
- **Helmet** security headers, `X-Powered-By` removed, and a
  Content-Security-Policy in production — where this process actually serves a
  document.
- **A 100kb JSON body limit**, refused as `413`.
- **Errors** never leak internals: an unexpected failure is one sentence and
  `INTERNAL_ERROR`; the detail stays in the server log.
- **Nothing is stored in the browser.** No token in `localStorage`, no user data
  in `sessionStorage`.

Known gaps: no email verification, no password reset, no MFA, no session
management screen, and the origin check is not a full CSRF-token flow.

## Database model

| Model | Purpose |
|---|---|
| `User` | account identity |
| `PasswordCredential` | the Argon2id hash, kept out of the profile table |
| `Session` | one row per active session, storing the token hash and expiry |
| `Workspace` | the top-level container, with a stable slug |
| `WorkspaceMember` | the join table carrying `role` and `joinedAt` |
| `Project` | belongs to a workspace; owns `key` and `nextIssueNumber` |
| `Sprint` | belongs to a project |
| `Issue` | belongs to a project; optional assignee and sprint; `number`, `status`, `position` |
| `Comment` | belongs to an issue and an author |
| `ActivityLog` | append-only record of meaningful changes |

Enums (`WorkspaceRole`, `ProjectStatus`, `SprintStatus`, `IssueType`,
`IssueStatus`, `Priority`) are real PostgreSQL enums. `(projectId, number)` is a
composite unique index.

Schema: [server/prisma/schema.prisma](server/prisma/schema.prisma).

## Local development

**Prerequisites:** Node.js 20.11+ (22 recommended), npm 10+, and a PostgreSQL
database. If you have no local PostgreSQL, `npx prisma dev --name devflow`
starts a disposable one and prints the URLs.

```bash
npm install
```

```bash
cp client/.env.example client/.env && cp server/.env.example server/.env
```

Set `DATABASE_URL` in `server/.env`, then:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

- Client: http://localhost:5174
- API health: http://localhost:4000/api/health

The Vite port is fixed with `strictPort`, so it fails loudly instead of moving
and breaking the server's allowed origin.

The seed creates three fictional accounts sharing one password — read
[server/prisma/seed.ts](server/prisma/seed.ts) for the values. **They are local
development fixtures and must never exist in a deployed environment.**

## Environment variables

**Server** (`server/.env.example`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | API port; `4000` is the local fallback, the platform assigns it in production |
| `CLIENT_ORIGIN` | the single trusted origin |
| `RENDER_EXTERNAL_URL` | supplied by the platform; used when `CLIENT_ORIGIN` is unset |
| `DATABASE_URL` | PostgreSQL connection string — no default |
| `DATABASE_POOL_MAX` | pool size (`2` for the local disposable server, `10` for a real one) |
| `SESSION_COOKIE_NAME` | cookie name, `devflow_session` |
| `SESSION_TTL_DAYS` | session and cookie lifetime |
| `AUTH_RATE_LIMIT_MAX` / `_WINDOW_MINUTES` | login and register attempt limit |
| `SERVE_CLIENT` / `CLIENT_DIST_PATH` | whether, and from where, Express serves the built client (defaults to production) |

There is no `SESSION_SECRET`: sessions are random tokens looked up in the
database, not signed data.

**Client** (`client/.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | `http://localhost:4000/api` locally, `/api` in the production build |

Only `VITE_`-prefixed variables reach the browser bundle, so no secret may ever
be put there. The environment is validated with Zod at server startup, and a
mistake prints the variable name and the rule it broke — never the value.

## Database commands

| Command | Result |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` — authors a migration (local only) |
| `npm run db:deploy` | `prisma migrate deploy` — replays committed migrations (containers, CI, production) |
| `npm run db:seed` | idempotent development seed |
| `npm run db:status` | migration status |
| `npm run db:check` | read-only sanity check |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run db:studio` | Prisma Studio (manual use) |

> **Warning:** `prisma migrate reset` drops the database and destroys all data.
> It is deliberately not wired into any npm script here.

## Testing

```bash
npm test
```

```bash
npm run test:client
```

```bash
npm run test:server
```

```bash
npm run test:coverage
```

Around 300 tests. The client suite needs no database. The server suite runs
against a **separate** database whose URL must contain `devflow_test` — the
setup refuses anything else, so a mistyped URL cannot touch development data:

```bash
cp server/.env.test.example server/.env.test
```

```bash
npm run db:test:prepare
```

Per-suite scripts exist too: `npm run test:auth`, `test:workspaces`,
`test:projects`, `test:sprints`, `test:issues`, `test:comments`,
`test:activities`, `test:kanban`, `test:dashboard`, `test:security`.

Coverage reports which lines ran, not whether the behaviour is right. There is
deliberately no threshold.

## Docker

The Compose stack is an alternative local setup: PostgreSQL, the API, and the
client behind nginx.

```bash
cp .env.docker.example .env.docker
```

```bash
docker compose --env-file .env.docker up --build
```

| What | Where |
|---|---|
| Client in Docker | http://localhost:5175 |
| Client with `npm run dev` | http://localhost:5174 |
| API | http://localhost:4000 |
| PostgreSQL from the host | `localhost:5433` |

The ports differ from the local setup on purpose, so both can run at once. The
server container applies migrations with `prisma migrate deploy` before
starting, and never runs the seed.

`docker compose down` keeps the data. `docker compose down -v` **deletes the
volume and every row in it.**

The deployment image is separate:

```bash
docker build -f Dockerfile.production -t devflow:production .
```

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every pull request
and every push to `main`: `npm ci` → `db:validate` → `db:generate` →
`db:deploy` → `typecheck` → `test` → `build`, against a disposable PostgreSQL
service container. No step is `continue-on-error`. The workflow verifies; it
does not deploy.

## Production deployment

One Render Web Service and one Render PostgreSQL, described in
[render.yaml](render.yaml):

```
Browser ──https──▶ Render Web Service (one container)
                     ├─ /api/*   Express API
                     └─ /*       the built React client
                            │
                            ▼
                   Render PostgreSQL
```

- **One origin.** Express answers `/api/*` and serves `client/dist` for
  everything else, so the session cookie stays first-party and `SameSite=Lax`
  keeps its meaning. A refresh on a React Router route returns `index.html`; an
  unknown `/api` address stays JSON.
- **The client** is built with `VITE_API_URL=/api`, so no deployment hostname is
  compiled into the bundle.
- **Port and origin** come from the platform: the server listens on
  `process.env.PORT` and trusts `CLIENT_ORIGIN`, else `RENDER_EXTERNAL_URL`.
  Production refuses to start without a resolvable origin.
- **Migrations** run before the server does: `prisma migrate deploy && node
  dist/server.js`. A failed migration stops the container.
- **The health check** is `GET /api/health`, public and session-free.
- **Production is never seeded.** The first account is created through
  `/register`.

Step-by-step guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Important technical decisions

| Decision | Why |
|---|---|
| Database sessions instead of JWT | Logout revokes instantly; a JWT stays valid until it expires |
| HTTP-only cookie instead of `localStorage` | An XSS bug cannot read the session |
| Argon2id for passwords, SHA-256 for session tokens | A password is low-entropy and needs a slow hash; a 32-byte random token does not, and speed matters on every request |
| Explicit `WorkspaceMember` join model | Membership carries `role` and `joinedAt` |
| Per-project issue counters in a transaction | `count + 1` is a real race; a row lock plus a unique index is not |
| Server-owned Kanban ordering in one `Serializable` transaction | A client cannot be trusted to order other people's cards |
| Roles read from the database on every request | The client is not a trusted source of its own permissions |
| One same-origin production service | Keeps the cookie first-party; a split deployment forces `SameSite=None` |
| Versioned migrations, never `db push` | Every environment reaches the same schema through the same reviewable steps |
| A real PostgreSQL test database | A mock cannot prove constraints, cascades or transactions |
| Hand-written CSS tokens, no UI framework | One theme and five kinds of block; a framework would decide the identity |

All 91 decisions, each with its rejected alternatives:
[docs/DECISIONS.md](docs/DECISIONS.md).

## Known limitations

- No realtime updates — another person's change appears after a refetch or
  reload; no WebSockets, notifications or email
- No email verification, password reset, MFA or session management screen
- Members must already be registered; there are no email invitations
- The login rate limiter is in-memory and per process
- The origin check is not a CSRF-token flow
- Deletion is permanent: no soft delete, no undo
- Comments are plain text, unpaginated, with no mentions or reactions
- The Kanban board has no swimlanes, WIP limits or sprint scoping
- The dashboard has no date filters, per-project breakdown or export
- One dark theme; `prefers-color-scheme: light` is ignored
- Verified in one Chromium engine at four widths; Safari, Firefox and real touch
  devices are unchecked
- No lint tooling, and no visual regression tests

## Future improvements

Password reset and email verification · workspace-wide issue search · realtime
board and feed updates · labels and attachments · a light theme · lint and
formatting in CI · Playwright end-to-end tests · a shared store for the rate
limiter.

## Project status

**Phase 9B of 10 — deployment preparation complete, deployment pending.**

| Area | Status |
|---|---|
| Product features (Phases 1–7) | Complete |
| Security, Docker, CI (Phase 8) | Complete |
| Visual system and browser QA (Phase 9A) | Complete |
| Production configuration, image, blueprint, docs (Phase 9B) | Complete |
| Pushed to GitHub | Pending |
| Deployed to Render | Pending |
| Live URL and screenshots | Pending |

Current state at any time: [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md).
Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md).

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, security, production topology |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Every technical decision with its rejected alternatives |
| [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) | Handover state, endpoints, verification status |
| [docs/ROADMAP.md](docs/ROADMAP.md) | The ten phases and their acceptance criteria |
| [docs/LEARNING_LOG.md](docs/LEARNING_LOG.md) | What each phase taught |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step GitHub and Render deployment |
| [docs/INTERVIEW_GUIDE.md](docs/INTERVIEW_GUIDE.md) | Every topic explained simply, technically, and as a Q&A |
| [docs/FINAL_QA.md](docs/FINAL_QA.md) | The manual pre-launch checklist |
| [docs/PORTFOLIO_COPY.md](docs/PORTFOLIO_COPY.md) | Ready-to-use portfolio text, Turkish and English |
