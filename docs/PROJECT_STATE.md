# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 3 — Authentication — COMPLETED.**
Phase 4 (Workspaces and memberships) has not started.

## Completed Work

- Phase 0: rules, architecture, roadmap, decisions, learning log.
- Phase 1: npm workspaces, React client (5174), Express server (4000),
  `/api/health`, CORS, first tests.
- Phase 2: Prisma 7 + PostgreSQL schema, initial migration, shared Prisma
  Client, idempotent seed, read-only database check, database npm scripts.
- Phase 3: email/password authentication with database-backed cookie sessions,
  `requireAuth` middleware, client auth pages and a protected `/app` route,
  dedicated test database and auth integration tests.

## Current Architecture

Phase 1 and 2 layout unchanged. Added:

```
server/src/modules/auth/       auth.routes | schemas | service | middleware | types
server/src/lib/apiError.ts     ApiError -> { success: false, error: { code, message } }
server/prisma/testDbUrl.ts     test database guard (URL must contain devflow_test)
server/prisma/prepareTestDb.ts db:test:prepare
client/src/lib/apiClient.ts    fetch wrapper, credentials: "include"
client/src/auth/               AuthProvider | RequireAuth (+ RedirectIfAuthenticated)
```

**New models:** `PasswordCredential` (one per user, Argon2id hash, cascade on
user delete) and `Session` (unique `tokenHash`, `expiresAt`, indexes on `userId`
and `expiresAt`, cascade on user delete).

**Auth endpoints:** `POST /api/auth/register` (201), `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me` (401 without a session).
Error codes: `VALIDATION_ERROR`, `EMAIL_IN_USE`, `INVALID_CREDENTIALS`,
`UNAUTHENTICATED`, `INTERNAL_ERROR`.

**Session approach:** 32 random bytes as an opaque token, stored only as a
SHA-256 hash; the raw token exists solely in the `devflow_session` cookie
(`httpOnly`, `sameSite=lax`, `secure` in production only, `path=/`, 7-day
`maxAge`). Expired sessions are rejected and deleted. Logout deletes the row and
clears the cookie.

**Client:** `/login` and `/register` are guest-only, `/app` requires a session,
shows a loading state during `GET /api/auth/me`, displays the current user's
name and email, and has a working logout button.
`GET /api/health` is still public.

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (24 tests) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` / `db:seed` / `db:check` | migration status, seed, read-only check |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run test:auth` | server authentication tests only |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 3)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Migration `20260726010000_add_authentication_models` | Created and applied |
| Prisma Client generation | Passed |
| Seed (twice) | Passed — 3 users, 3 password credentials, no duplicates, no sessions |
| `npm run db:check` | Passed |
| `npm run db:test:prepare` | Passed |
| `npm run test:auth` | Passed (12 tests) |
| `npm test` | Passed — client 9, server 15 |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Manual: register / login / me / logout via HTTP | Passed, cookie `HttpOnly; SameSite=Lax`, no `Secure` in development |
| Manual: `/api/auth/me` without a cookie, `/api/health` public | 401 and 200 as expected |
| No token in `localStorage` | Confirmed — the client never writes browser storage |

## Known Limitations

- Test database: no local PostgreSQL and no Docker on this machine, and a second
  `npx prisma dev` server never left `starting_up`. The test database is
  therefore an isolated PostgreSQL **schema** named `devflow_test` on the same
  disposable server (`server/.env.test`, `...&schema=devflow_test`). It has its
  own tables and its own migration history; the development data in `public` is
  untouched. On a normal PostgreSQL use a real `devflow_test` database instead.
- The disposable `prisma dev` server changes ports when recreated, so both
  `server/.env` and `server/.env.test` must be updated from the URLs it prints.
- `prisma migrate dev` still fails against that server (`P1017`); migrations are
  produced with `prisma migrate diff --from-migrations --to-schema` and applied
  with `prisma migrate deploy`.
- Documented but **not implemented**: login rate limiting, email verification,
  password reset, multi-factor authentication, session/device management, and a
  CSRF token strategy for a future cross-site deployment. `SameSite=Lax`, a
  single allowed origin and JSON-only requests cover the current same-site local
  setup; revisit before deploying in Phase 9.
- No workspace, project, issue, comment or Kanban endpoints yet. Workspace roles
  exist in the database but no authorization check reads them.
- No Docker, no CI, no lint tooling (Phase 8).

## Next Task

**Phase 4 — Workspaces and Memberships.** Workspace CRUD behind `requireAuth`,
membership with `OWNER`/`ADMIN`/`MEMBER` roles, a role-based authorization
helper returning `403`, and Zod validation on every endpoint.
