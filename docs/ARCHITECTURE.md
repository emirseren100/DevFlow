# DevFlow — Architecture

Planned architecture. Nothing in this document is implemented yet (Phase 0).

DevFlow is a **single monolithic web application** with two deployable parts:
a React client and an Express API server, sharing one PostgreSQL database.
No microservices, no message queues, no enterprise layering.

## 1. Client / Server Split

```
DevFlow/
├── client/     React + TypeScript + Vite  (browser UI)
├── server/     Node.js + Express + TypeScript  (REST API)
├── docs/       project documentation
└── docker-compose.yml   local PostgreSQL (and later the app services)
```

- `client/` knows nothing about the database. It only calls the REST API.
- `server/` is the only part that talks to PostgreSQL, through Prisma.
- Each side has its own `package.json` and its own `tsconfig.json`.
- Shared types are duplicated intentionally or exported from the server as
  plain TypeScript types; no shared build package in early phases.

## 2. Data Flow

```
React component
  → typed API helper (fetch, credentials: "include")
  → Express router
  → Zod validation of body/params/query
  → auth middleware (session) + authorization check (membership/role)
  → service/controller function
  → Prisma Client
  → PostgreSQL
  ← row(s) mapped to a plain response object
  ← { success: true, data } JSON
  ← component state update
```

Rules:
- The browser never sends a token in a header; the session cookie travels
  automatically because requests use `credentials: "include"`.
- The client never trusts its own copy of a permission; the server re-checks.

## 3. REST API Approach

- Resource-oriented URLs, plural nouns, nesting only one level deep.
- Standard verbs: `GET`, `POST`, `PATCH`, `DELETE`.

Planned surface (illustrative, subject to Phase 4–6 work):

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:workspaceId
PATCH  /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId
GET    /api/workspaces/:workspaceId/members
POST   /api/workspaces/:workspaceId/members
PATCH  /api/workspaces/:workspaceId/members/:memberId
DELETE /api/workspaces/:workspaceId/members/:memberId

GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects

GET    /api/projects/:projectId/issues?status=&assigneeId=&type=&q=
POST   /api/projects/:projectId/issues
PATCH  /api/issues/:issueId
GET    /api/issues/:issueId/comments
POST   /api/issues/:issueId/comments
GET    /api/issues/:issueId/activity
```

- Filtering, search and sorting are query parameters, never separate endpoints.
- Pagination uses `page` and `pageSize` query parameters.

## 4. Authentication — HTTP-only Cookie Session

- Password hashing with a strong one-way hash; plaintext passwords are never
  stored or logged.
- On successful login the server sets a **session cookie**:
  `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production,
  plus an explicit `maxAge`.
- `httpOnly` means client-side JavaScript cannot read the cookie, which removes
  the XSS token-theft problem that `localStorage` tokens have.
- Logout clears the cookie server-side.
- An `requireAuth` middleware resolves the session to a `req.user` and returns
  `401` when it cannot.

### 4.1 As implemented in Phase 3

Server module: `server/src/modules/auth/` — `auth.routes.ts` (HTTP),
`auth.schemas.ts` (Zod), `auth.service.ts` (passwords and sessions),
`auth.middleware.ts` (`attachSession`, `requireAuth`), `auth.types.ts`
(`SafeUser` and the Express request augmentation).

**Registration** — `POST /api/auth/register` validates the body with Zod, lowercases
and trims the email, rejects an existing email with `409 EMAIL_IN_USE`, hashes the
password with **Argon2id**, then creates the `User` row and its `PasswordCredential`
row **in one transaction** so a user can never exist without a password. A session is
created and the cookie is set, so registering signs you in.

**Login** — `POST /api/auth/login` looks the user up by normalized email and verifies
the Argon2id hash. An unknown email and a wrong password produce exactly the same
`401 INVALID_CREDENTIALS` / "Invalid email or password.", and an unknown email is still
verified against a dummy hash, so neither the message nor the timing reveals whether an
account exists.

**Opaque session tokens** — a session token is 32 random bytes from
`crypto.randomBytes`, base64url encoded. It is *opaque*: it carries no data, so nothing
can be read out of it and nothing can be forged into it. The database stores only its
**SHA-256 hash** in `Session.tokenHash`.

**Why the raw token is never stored** — anyone who reads the `sessions` table (a leaked
dump, a backup, an SQL-injection bug) would otherwise hold working session tokens for
every logged-in user. Hashes are useless for logging in: a request is authenticated by
hashing the incoming cookie value and looking for that hash. SHA-256 is the right
choice here — not Argon2 — because the input is already 32 random bytes and cannot be
brute-forced; Argon2's deliberate slowness is only needed for human-chosen passwords.

**Cookie** — `devflow_session`, `httpOnly` (page JavaScript cannot read it, so an XSS
bug cannot steal it), `sameSite: "lax"` (not sent on cross-site POSTs), `secure` only in
production (so plain `http://localhost` still works), `path: "/"`, and a `maxAge`
matching `SESSION_TTL_DAYS`. No cookie `domain` is set in development.

**Reading a session** — `attachSession` hashes the cookie value, loads the matching
`Session` with only the safe user columns, and treats an expired row as no session at
all, deleting it on the way out. `requireAuth` then answers `401 UNAUTHENTICATED` when
no user was attached. Only `SafeUser` (`id`, `name`, `email`) is ever attached to the
request or returned.

**Logout** — deletes the session row and clears the cookie. It succeeds even when the
cookie is missing or already invalid, so logging out twice is not an error.

**Client session restoration** — `AuthProvider` calls `GET /api/auth/me` once on mount.
The browser attaches the cookie by itself, so "am I still logged in after a refresh?" is
a single server question and the client never holds a token. `RequireAuth` renders a
loading state while that call is pending, then either shows the route or redirects to
`/login`; `RedirectIfAuthenticated` does the reverse for `/login` and `/register`.

## 5. Authorization

Two layers, always on the server:

1. **Authentication** — is there a valid session? (`401` if not)
2. **Authorization** — may *this* user touch *this* record? (`403` if not)

Model:
- A user reaches data only through **workspace membership**.
- Membership carries a role: `OWNER`, `ADMIN`, `MEMBER`.
- Every project and issue belongs to a workspace; access is checked by walking
  up to the owning workspace and confirming membership.
- Ownership-sensitive actions (delete workspace, remove member, change roles)
  require `OWNER`/`ADMIN`.
- Never rely on an ID being unguessable. Every request re-checks membership.

Phase 3 built **only** the authentication half: `requireAuth` answers "is this a real,
unexpired session?" and nothing more. Phase 4 added the second half for workspaces.

### 5.1 Workspace authorization as implemented in Phase 4

Server module: `server/src/modules/workspaces/` — `workspace.routes.ts` (HTTP),
`workspace.schemas.ts` (Zod), `workspace.service.ts` (queries and invariants),
`workspace.authorization.ts` (membership and role checks), `workspace.types.ts`
(response shapes and the `req.workspace` augmentation).

**Ownership and membership are two different things.** `Workspace.ownerId` records who
created the workspace, and the creator additionally gets a `WorkspaceMember` row with the
role `OWNER`. Access is granted only by the membership row: owning a workspace without a
membership would give no access, which is why both are written in the same transaction.

**Role-check flow** for every `/api/workspaces/:workspaceId/...` request:

```
requireAuth            → who is the user?              (401 if no session)
requireWorkspaceMember → load workspace + this user's membership in one query
                         no workspace → 404 WORKSPACE_NOT_FOUND
                         no membership → 403 FORBIDDEN
                         otherwise      → req.workspace = { workspaceId, role, membershipId }
requireWorkspaceAdmin  → OWNER or ADMIN only           (403 otherwise)
requireWorkspaceOwner  → OWNER only                    (403 otherwise)
service                → target-specific rules (owner membership immutable, self-removal)
```

The role always comes from PostgreSQL. A role in the request body, in a header or in
client state is never read, because anyone can craft a request by hand.

**Workspace creation transaction** — `POST /api/workspaces` writes the `Workspace`, the
creator's `OWNER` membership and the `WORKSPACE_CREATED` activity inside one
`prisma.$transaction`. Either all three exist or none does, so an ownerless workspace
cannot be created by a crash between two writes. The slug is generated on the server from
the name and made unique with a numeric suffix; a lost race on the unique slug index is
retried instead of failing the request.

**Client to server data flow** — `client/src/lib/workspaceApi.ts` wraps the existing
`apiRequest` helper (`credentials: "include"`, shared success/error shape). The workspace
pages hold the response in React state only. The same permission rules exist in
`workspaceApi.ts` as small helpers, but they only decide which buttons are worth showing:
every request is authorized again on the server.

## 6. Zod Validation Boundaries

Zod runs at exactly one place: **the edge of the API**.

- Request `body`, `params` and `query` are parsed by a schema before the handler
  runs. Invalid input produces `400` with field-level details.
- Environment variables are parsed by a Zod schema at server startup; the
  process exits if required variables are missing.
- Inside services the data is already typed and trusted — no re-validation.
- Zod schemas are the single source of truth for input shape; handler types are
  inferred with `z.infer` instead of being written twice.

## 7. Prisma and PostgreSQL

**PostgreSQL** stores all application data and enforces the hard rules:
primary keys, foreign keys, unique constraints and enum values. Anything the
database can guarantee is not left to application code.

**Prisma schema** — `server/prisma/schema.prisma` is the single source of truth
for the data model. `server/prisma.config.ts` (Prisma 7) points at the schema,
the migrations folder and the seed command, and reads `DATABASE_URL`.

**Migrations** — `prisma migrate dev` turns schema changes into SQL files under
`server/prisma/migrations/`. Those files are committed, so every machine and
environment builds the same tables in the same order.

**Prisma Client** — generated into `server/src/generated/prisma` (git-ignored)
and wrapped by `server/src/lib/prisma.ts`, which creates exactly one client for
the process. Prisma 7 connects through the `@prisma/adapter-pg` driver adapter
over the `pg` connection pool.

**Seed data** — `server/prisma/seed.ts` writes a small deterministic dataset
with fixed `seed_*` ids and `upsert`, so it can run repeatedly without creating
duplicates. `server/prisma/check.ts` is a read-only counterpart that counts rows
and verifies the seeded relations.

Relation overview:

```
User 1───* Workspace            (owner)
User *───* Workspace            through WorkspaceMember (role: OWNER/ADMIN/MEMBER)
Workspace 1───* Project
Project   1───* Sprint
Project   1───* Issue
Sprint    1───* Issue           (optional; deleting a sprint nulls the link)
User      1───* Issue           as reporter (required) and assignee (optional)
Issue     1───* Comment
Workspace 1───* ActivityLog     (project, issue and actor are optional)
```

Data flow: React → REST call → Express handler → Prisma Client → PostgreSQL,
and back as plain JSON. The client never sees Prisma types or SQL.

The `GET /api/health` endpoint deliberately does **not** touch the database. It
answers "is the API process alive and reachable", which stays true and useful
even while PostgreSQL is down; a separate database check (`npm run db:check`)
answers "is the database reachable and seeded". Mixing the two would make a
database outage look identical to a crashed API.

Database access appears in the code only from Phase 3 onwards: authentication
reads and writes users and sessions, and Phases 4-6 add workspace, project,
issue, comment and activity queries. Queries use Prisma Client only — no raw
SQL unless a query cannot be expressed otherwise, and then with parameter
binding. Multi-write operations that must not half-apply use
`prisma.$transaction`.

## 8. Standard API Response Shape

Every JSON response follows one of two shapes.

Success:

```json
{
  "success": true,
  "data": { }
}
```

Paginated success:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 137 }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [{ "path": "title", "message": "Title is required" }]
  }
}
```

- A single Express error-handling middleware produces every error response.
- Error codes are a small fixed set: `VALIDATION_ERROR` (400),
  `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
  `CONFLICT` (409), `INTERNAL_ERROR` (500).
- Internal error details and stack traces are logged, never returned.

## 9. Testing Layers

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Pure functions: validation schemas, permission helpers, formatters |
| API integration | Vitest + Supertest | Real Express app against a test database: status codes, response shape, auth and authorization rules |
| Component | Vitest + React Testing Library | Rendering and user interaction, querying by role/text, not by class name |

- Tests describe user-visible behaviour, not implementation details.
- API integration tests reset the test database between runs.
- The full suite plus a production build runs at the end of each phase and in CI.

## 9.1 Projects, Sprints and Issues (Phase 5)

**Ownership chain.** A workspace has many projects; a project has many sprints
and many issues; an issue may point at one sprint of *its own* project. Nothing
in this chain is optional except the sprint link:

```
Workspace 1─n Project 1─n Sprint
                 │           │
                 └────n Issue ┘ (sprintId is nullable)
```

**Reporter and assignee.** An issue always has a reporter — the user who created
it, taken from the session and never from the request body — and optionally one
assignee, who must be a current member of the owning workspace. The two
relations point at the same `User` model but answer different questions: who
asked for the work, and who is doing it.

**Project-scoped issue numbers.** Issues are shown as `KEY-number` (`API-14`).
The key lives on the project and the number on the issue; the readable key is
built when a response is assembled and is never stored a second time, so a
renamed project cannot leave stale keys behind. Each project owns a
`nextIssueNumber` counter, which is why two projects can both have issue 1.

**Transactional allocation.** Creating an issue runs one transaction that
increments `project.nextIssueNumber`, reads the value it just took, and inserts
the issue with that number. The increment locks the project row, so a second
request that arrives at the same moment waits and receives the following number.
Counting existing issues (`count + 1`) would let two requests read the same
total and write the same number. A unique index on `(projectId, number)` is the
final guarantee, in case any future code path forgets the transaction.

**Relation validation happens on the server.** Two middlewares run before every
project route: workspace membership, then `requireProject`, which loads the
project *filtered by the workspace id from the URL*. A project id from another
workspace therefore returns `404 PROJECT_NOT_FOUND` rather than data. The same
pattern repeats one level down: a sprint or an issue is always looked up with
its `projectId` in the filter, and a new assignee or sprint is verified against
the database before it is written.

**Issue list flow.** The query string is parsed with Zod (unknown sort fields
become `INVALID_SORT`, other bad values `INVALID_FILTER`), turned into one
Prisma `where` object, and answered with two queries: a `count` for the
pagination metadata and one `findMany` that joins the reporter, assignee and
sprint. Paging is done in the database with `skip` and `take`, capped at 100
rows, so the response size never depends on how large the project has grown.

## 9.2 Comments, Activity and the Kanban Board (Phase 6)

**Comment flow.** A comment belongs to exactly one issue and one author:
`Issue 1─n Comment n─1 User`. Deleting an issue cascades to its comments;
deleting a user is restricted while comments exist, so a comment never loses its
author. Every route walks the whole chain in the database — membership, project
in workspace, issue in project, comment on issue — so a foreign id gives a 404 or
a 403, never data. The author id is taken from the session, never from the body.
Bodies are plain text: trimmed, 1–5000 characters, rendered with
`white-space: pre-wrap`, so a user's HTML stays visible characters. Editing is
restricted to the author (an `OWNER` may delete somebody's words but not rewrite
them); deleting is allowed for the author, `OWNER` and `ADMIN`.

**What `ActivityLog` is for.** It is an append-only audit trail of meaningful
state changes: who did what, to which issue, when. Nothing edits or deletes a
row, and reads are never logged. It answers "what happened here?" without
inspecting every table's `updatedAt`, and it is the data behind both feeds.

**Structured metadata, not sentences.** A row stores a `type` plus a small JSON
object (`previousStatus`, `nextStatus`, `previousAssigneeId`, `nextAssigneeId`,
`changedFields`, `commentId`, …). The readable sentence is built in the client
from those fields, so wording can change without a migration. On the way out the
metadata passes a key whitelist, so nothing unexpected can leak through a feed,
and the actor is reduced to `id`, `name` and `email` (or `null`, rendered as a
system action).

**Status and position.** A card's column is `Issue.status` and its place inside
that column is `Issue.position` — a column-local integer starting at 0. The
composite index `(projectId, status, position)` serves both the board query and
the reorder reads. The whole board is one `findMany` grouped in memory, so five
columns cost one round trip and no N+1.

**Server-owned ordering.** `PATCH .../issues/:issueId/move` accepts only
`targetStatus` and `targetIndex`. The server loads the destination column in real
position order, clamps the index to that column's length, inserts the card,
renumbers the destination and — when the status changed — the source column as
well, then writes the status change activity. A client-supplied list of issue ids
is never accepted, and the response is the confirmed board.

**Transactional reorder.** All of those writes happen inside one
`prisma.$transaction` with `Serializable` isolation, so two people reordering the
same column cannot interleave their reads and produce duplicate positions. A
write conflict (Prisma `P2034`) is retried a small, bounded number of times. A
failure leaves the previous order completely untouched — there is no half-applied
move.

**Client flow and rollback.** `@dnd-kit` reports a drop, the board applies the
move locally for instant feedback, and the request goes out with three values.
The server's board replaces the local one on success. On failure the saved board
is restored and an error is shown, so a rejected move can never leave a card
duplicated or missing. A labelled "Move … to" select does the same thing without
dragging, because a keyboard-only or touch user must not be locked out; the drag
handle is hidden when the server says `canMove: false`, which is convenience,
never protection.

**Why realtime is deferred.** Another person's move appears on reload. Live
updates would need a second protocol (WebSockets or SSE), connection state,
reconnection, per-workspace authorization on every message and a much harder test
story. The MVP's value — correct, authorized, durable ordering — is already
delivered by one transaction over HTTP, so realtime belongs to a later phase.

## 9.3 The Application Shell and Server State (Phase 7)

**Two layouts, not one.** `RootLayout` wraps the public site (home, login,
register). `AppShell` wraps everything behind `/app`: the brand link, the
workspace switcher, the workspace navigation, the current user and sign out. A
page therefore never repeats the frame around itself, and the document always
has exactly one `<main>` landmark and one `<h1>`.

**Nested routing.** `/app` is one route with children, so the shell mounts once
and only the outlet changes on navigation. `/app` redirects to
`/app/workspaces`, and `/app/workspaces/:workspaceId` redirects to that
workspace's `dashboard` — selecting a workspace means opening its overview.

**Workspace context** is read from the path
(`/app/workspaces/:workspaceId/...`) rather than from `useParams`, because the
shell sits above the route that declares the parameter. The workspace itself is
looked up in the cached `GET /api/workspaces` answer, so a nested page adds no
request, and an id that is not in that list simply shows no workspace context.

**API client flow.** One `apiRequest` in `client/src/lib/apiClient.ts` still
sends `credentials: 'include'` and unwraps the shared `{ success, data }`
envelope. It now also carries the HTTP status and the stable server code on the
thrown `ApiError`, accepts an `AbortSignal`, and turns an unreachable server
into the same typed error. Domain helpers (`workspaceApi`, `projectApi`,
`collaborationApi`, `dashboardApi`) build the URLs, so no component
concatenates a path or parses a response by hand.

**Server state lives in TanStack Query.** One `QueryClient` is created near the
root, inside `AuthProvider` so a `401` can clear the signed-in user. Defaults
are conservative: no automatic retry, no refetch on focus, `staleTime` of 30
seconds. Client state (form drafts, "is this dialog open") stays in `useState`;
`AuthProvider` still owns the authentication lifecycle.

**Query keys** all come from `client/src/lib/queryKeys.ts`. They read like the
URL, from the widest scope to the narrowest, and separate `list` from `detail`
so invalidating a list never discards the details under it. A scope key is the
prefix of everything inside it, which is useful on purpose — and the reason
`exact: true` and the `…Lists` helpers exist for the cases where it is too much.

**Mutation invalidation** is targeted, never "invalidate everything": adding a
member refreshes the members, the workspace and the dashboard; creating a
project refreshes the project lists and the dashboard; a Kanban move refreshes
the board and, only when the status actually changed, the issue, the project
lists, the feeds and the dashboard metrics.

**Dashboard aggregation.** `GET /api/workspaces/:workspaceId/dashboard` answers
one screen with one request. Counts use Prisma `count` and `groupBy` filtered by
`project: { workspaceId }`, so the numbers are computed in PostgreSQL and no
issue list is downloaded to be counted; distributions are seeded with zeros so
the client never has to guess a missing status. Overdue is decided by the
server's clock (`dueDate < now` and status not `DONE`) — a browser date is never
trusted. Recent activity reuses the feed's own mapper, so the metadata whitelist
applies there too, and no issue description or comment body is ever selected.

**Loading, error and empty boundaries.** `LoadingState`, `EmptyState` and
`ErrorState` are shared, so no screen renders blank while it waits.
`ErrorState` chooses its wording from the HTTP status: `403` explains the
missing permission, `404` explains the missing resource, and neither offers a
retry because the same request would fail the same way. Everything else offers
**Try again**; the server code stays in the error object for troubleshooting and
never appears as the user-facing message.

**URL filter state.** The issue filters remain query-string state and are part
of the query key, so back, forward, reload and a shared link restore the same
list, each filter combination is cached separately, and a late answer for an old
filter cannot overwrite the current one.

## 9.4 Security, Containers and CI (Phase 8)

**Environment validation.** `server/src/config.ts` parses `process.env` with
Zod exactly once, at import time, and everything else imports the resulting
`config`. `PORT` and `SESSION_TTL_DAYS` are turned into numbers, `NODE_ENV` is
restricted to `development | test | production`, `CLIENT_ORIGIN` must be an
absolute http(s) origin with no path, and `DATABASE_URL` has no default — a
missing one stops the process instead of connecting somewhere unexpected. The
failure message lists variable names and broken rules only; a value is never
echoed, because `DATABASE_URL` carries a password.

**Middleware order** in `createApp()` is deliberate:

```
disable x-powered-by
  -> helmet            (headers on every response, errors included)
  -> cors              (must answer the preflight before anything refuses it)
  -> express.json 100kb (a size limit, so a body cannot exhaust memory)
  -> cookie-parser     (the session token arrives as a cookie)
  -> requireAllowedOrigin (mutations only; after CORS so OPTIONS still works)
  -> auth rate limiter (mounted on the two auth paths only)
  -> routers
  -> notFound -> errorHandler
```

**Rate limiting** applies to `POST /api/auth/login` and
`POST /api/auth/register` and nowhere else: those are the guessable endpoints,
and a global limit would punish a normal session, since one board screen makes
several requests. The counter is per IP and in memory — correct for one
process, and something a multi-instance deployment has to replace with a shared
store. A blocked attempt answers `429 RATE_LIMITED` through the normal error
handler, with wording that is identical for a known and an unknown email.

**Origin validation.** A cookie is attached by the browser no matter which page
started the request, so `POST`, `PUT`, `PATCH` and `DELETE` must carry an
`Origin` equal to `CLIENT_ORIGIN`. `GET`, `HEAD` and `OPTIONS` are never
blocked. A *missing* `Origin` is accepted outside production because browsers
always send it on those methods and page JavaScript cannot set it, so a request
without one is not a browser; production refuses it as well. This is a small
readable check, not a CSRF-token framework, and the deployment topology (same
site, subdomain, or a proxy in front) changes what `SameSite=Lax` covers, so it
must be reviewed again in the deployment phase.

**Production error handling.** The error handler classifies `ApiError` and the
two failures `express.json()` raises before any route runs
(`PAYLOAD_TOO_LARGE`, `MALFORMED_JSON`). Everything else becomes
`500 INTERNAL_ERROR` with one fixed sentence: no stack trace, no Prisma
message, no file path and no environment value leaves the process. The detail is
logged instead — except under `NODE_ENV=test`, where failure paths are exercised
on purpose and their stack traces would bury the test output.

**Test-database isolation.** `prisma/testDbUrl.ts` refuses any `DATABASE_URL`
that does not contain `devflow_test`, and the guard runs before the app — and
therefore before Prisma — is imported. Each suite owns an email domain and
cleans only its own rows, so files are independent and none of them reads the
development seed. Vitest restores mocks and stubs between tests, and the server
project disables file parallelism because all suites share one database.

**Docker services.**

```
Client container (nginx :80)
  -> Server container (node :4000)
    -> PostgreSQL container (:5432)
```

Both images are multi-stage: a build stage holds the toolchain, and the runtime
stage keeps only what actually runs — compiled JavaScript and production
dependencies for the server, static files and nginx for the client. Vite inlines
`VITE_API_URL` at build time, so the client image takes it as a build argument
rather than a runtime variable.

**Docker networking.** Inside the Compose network services address each other by
service name on their real ports (`postgres:5432`). The host mapping exists only
for humans and is chosen not to collide with a local setup: the client is
published on `5175` (the Vite dev server keeps `5174`) and PostgreSQL on `5433`
(an installed PostgreSQL keeps `5432`).

**Migrations at container start.** The server waits for the database
*healthcheck*, not merely for a started container, then runs
`prisma migrate deploy` before `node dist/server.js`. `deploy` only replays
committed migrations: it never authors one, never prompts and never resets. The
development seed is never run automatically.

**CI verification flow.** `.github/workflows/ci.yml` runs on pull requests and
pushes to `main` against a disposable `devflow_test` PostgreSQL service:

```
npm ci -> db:validate -> db:generate -> db:deploy -> typecheck -> test -> build
```

Every step is an npm script that also works from the repository root on a
developer machine, so CI cannot drift from local behaviour, and no step is
allowed to fail softly. The workflow verifies only; deployment is Phase 9.

## 9.5 The Visual System (Phase 9A)

**One stylesheet, three layers.** `client/src/index.css` is the whole visual
language, in a fixed order: custom-property tokens, then the browser elements
the application actually uses, then the repeated blocks. Nothing is styled
anywhere else — there is no CSS module, no CSS-in-JS and no UI framework. A
component that needs a colour reads a token; a component that invents one is the
bug.

**Tokens.** Four surfaces (`--bg`, `--surface`, `--surface-raised`,
`--surface-sunken`), two border weights, three text steps, one accent
(`--accent`) reserved for the active state and the primary action, four
semantic colours (danger, warning, success, info), six spacing steps, one
radius scale, one focus ring, five type sizes. Hierarchy comes from the surface
and the border, never from a shadow.

**Why no framework.** The application is a shell, a form, a list, a badge and a
dialog. A component library would ship a design system and its opinions for
five kinds of block, and would have to be fought whenever it disagreed; utility
CSS would move the same decisions into the markup. The trade-off is recorded in
`DECISIONS.md` row 79.

**Presentation stays in the client.** The API keeps returning database enums
(`IN_PROGRESS`, `URGENT`, `ARCHIVED`, `OWNER`). The label maps that turn them
into words live next to the API types — `TYPE_LABELS`,
`PROJECT_STATUS_LABELS`, `SPRINT_STATUS_LABELS` in `projectApi.ts`,
`ROLE_LABELS` in `workspaceApi.ts`, `PRIORITY_LABELS` in `badges.tsx` — so
wording changes need no migration and no API change. `activityText.ts` already
worked this way for activity sentences, and now degrades gracefully when a row
carries no status metadata.

**Accessibility is structural, not cosmetic.** One `banner`, one `main`, one
`h1` per page — `PageHeader` renders a `div` precisely so it cannot become a
second banner landmark inside `main`. Status is never signalled by colour
alone: every badge spells its value out, and the dashboard bars are
`aria-hidden` because the number beside them already carries the information.
Every text step clears 4.5:1 against the surface it sits on.

**Destructive actions share one modal.** `ConfirmDialog` replaced the inline
"click delete twice" pattern for workspaces, projects, issues, comments and
memberships. It is `role="dialog" aria-modal="true"`, named by its own heading,
opens focus on **Cancel**, traps Tab, closes on Escape and returns focus to the
control that opened it — one accessibility contract to get right instead of
five.

**Responsive layout** stays structural: the 900px breakpoint collapses the
navigation behind the Menu button and drops the user's email, a 560px pass
stacks the filter bar and gives page and dialog actions full-width touch
targets, and the Kanban board scrolls sideways at every width because five
columns squeezed into a phone are unreadable, not responsive.

## 9.6 Production Deployment — One Same-Origin Service (Phase 9B)

Local development runs **two** origins: the Vite dev server on `http://localhost:5174`
and the API on `http://localhost:4000`. Production runs **one**:

```
Browser
  │  https://<app>.onrender.com
  ▼
Render Web Service  (one Docker container, one Node process)
  ├─ GET  /api/health          public
  ├─ *    /api/*               the Express API
  ├─ *    /api/<unknown>       JSON 404 — never HTML
  └─ GET  /<anything else>     client/dist  →  index.html
  │
  ▼  private network
Render PostgreSQL  (devflow-db)
```

**Why one origin.** The session lives in a cookie. On one origin that cookie is
first-party: `SameSite=Lax` keeps its full meaning, the `Origin` check compares
one exact string, and no CORS exception is needed for the real client. A split
deployment — client on one host, API on another — would make every authenticated
request cross-site and force `SameSite=None`, which browsers increasingly
restrict.

**Express serving the client** (`server/src/middleware/serveClient.ts`). Mounted
after every router *and* after the API's own 404, so `/api/does-not-exist` is
already answered with JSON before the client router exists. Then:

1. `express.static(client/dist)` — hashed assets, cached; source maps refused
2. a `GET`/`HEAD` fallback returning `index.html`, so a refresh on
   `/app/workspaces/…/board` returns the same document the first load returned

The directory is found by walking up from the module's own location, which lands
on `<repo>/client/dist` from both `server/src/` and the compiled
`server/dist/`; `CLIENT_DIST_PATH` overrides it. The whole block only runs when
`config.serveClient` is true, which defaults to `NODE_ENV=production` — so a
local `npm run dev` still uses Vite, and the Docker Compose stack (where nginx
serves the client) simply finds no build and logs that it is serving the API
only.

**The API base URL.** The production bundle is built with `VITE_API_URL=/api` —
a relative path, so every request goes to the page's own origin and no
deployment hostname is compiled into the JavaScript. `client/src/lib/env.ts`
accepts an absolute `http(s)` URL *or* a single-slash path, and rejects a
protocol-relative value like `//evil.example/api`.

**Port and origin on Render.** The platform assigns `PORT` and publishes
`RENDER_EXTERNAL_URL`. The trusted origin is resolved as `CLIENT_ORIGIN` →
`RENDER_EXTERNAL_URL` → `http://localhost:5174` (outside production only). In
production there is no fallback: without a resolvable origin the process refuses
to start. `trust proxy` is set to exactly one hop, so the login rate limiter
counts the real caller behind Render's HTTPS proxy rather than the proxy itself.

**The Content-Security-Policy** is switched on exactly when this process serves
a document — `default-src 'self'`, no framing, no object, scripts and API calls
from the same origin only. When the API answers JSON alone there is no document
here to protect and it stays off, as in Phase 8.

**Migrations.** The container starts with `npm run start:production`, which is
`prisma migrate deploy && node dist/server.js`. Committed migrations are
replayed — never authored, never reset — and the `&&` means a failed migration
stops the container instead of serving an application against a stale schema.
The development seed is never run: production starts empty and its first account
is created through `/register`.

**Health check.** `GET /api/health` is public, needs no session and touches no
table. Render calls it before routing traffic to a new deployment, so a
container that cannot answer never replaces the running one.

**The image.** `Dockerfile.production` at the repository root: one multi-stage
build that installs the workspace with `npm ci`, generates the Prisma Client,
builds the client and the server, then copies the compiled server, the built
client, the schema and the migration history into a runtime image with
production dependencies only, running as the unprivileged `node` user. The
Phase 8 `client/Dockerfile` and `server/Dockerfile` are untouched and still
serve Docker Compose.

## 10. Docker Compose

- Local development starts with Compose providing **PostgreSQL** (and optionally
  a pgAdmin-free setup) with a named volume for data.
- The client and server run on the host with `npm run dev` during early phases;
  Dockerfiles for both are added in Phase 8.
- Compose is for local development and demo parity, not for orchestration.

## 11. Environment Variables

- Each side has its own `.env`, loaded from `client/` and `server/`.
- `.env` is git-ignored; a committed `.env.example` (added in Phase 1) lists
  every required key with a safe placeholder value.
- Server keys: `DATABASE_URL`, `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`,
  `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`. There is no `SESSION_SECRET`:
  sessions are random tokens looked up in the database, not signed data, so
  there is nothing to sign.
- Production adds `RENDER_EXTERNAL_URL` (supplied by the platform, used as the
  trusted origin when `CLIENT_ORIGIN` is unset) and the optional `SERVE_CLIENT`
  and `CLIENT_DIST_PATH`, which decide whether — and from where — this process
  serves the built client.
- `server/.env.test` holds the dedicated test database URL and is git-ignored
  like `.env`.
- Client keys must be prefixed `VITE_` to be exposed by Vite — and therefore
  must never contain a secret, because they are bundled into public JavaScript.
- The server validates its environment with Zod at startup and fails fast.
