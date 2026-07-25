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
POST   /api/workspaces/:workspaceId/members

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

- `prisma/schema.prisma` is the single source of truth for the data model.
- `prisma migrate dev` creates SQL migrations that are committed to git.
- `prisma generate` produces a typed client; generated output is git-ignored.
- Relations are modelled explicitly (User, Workspace, Membership, Project,
  Issue, Comment, Activity) with foreign keys and indexes on lookup columns.
- Queries use Prisma Client only — no raw SQL unless a query cannot be
  expressed otherwise, and then with parameter binding.
- Multi-write operations that must not half-apply use `prisma.$transaction`.

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
- Server keys (planned): `DATABASE_URL`, `SESSION_SECRET`, `PORT`,
  `NODE_ENV`, `CLIENT_ORIGIN`.
- Client keys must be prefixed `VITE_` to be exposed by Vite — and therefore
  must never contain a secret, because they are bundled into public JavaScript.
- The server validates its environment with Zod at startup and fails fast.
