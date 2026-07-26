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
- `server/.env.test` holds the dedicated test database URL and is git-ignored
  like `.env`.
- Client keys must be prefixed `VITE_` to be exposed by Vite — and therefore
  must never contain a secret, because they are bundled into public JavaScript.
- The server validates its environment with Zod at startup and fails fast.
