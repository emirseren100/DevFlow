# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 4 — Workspaces and Memberships — COMPLETED.**
Phase 5 (Projects and issues) has not started.

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

## Current Architecture

Phase 1-3 layout unchanged. Added:

```
server/src/modules/workspaces/  workspace.routes | schemas | service |
                                authorization | types
server/src/lib/parseBody.ts     shared Zod -> VALIDATION_ERROR helper
server/src/lib/pathParam.ts     single-value route parameter reader
client/src/lib/workspaceApi.ts  typed workspace calls + permission helpers
client/src/pages/WorkspaceListPage.tsx | WorkspaceDetailPage.tsx
```

No schema change and no new migration were needed: the Phase 2 `Workspace`,
`WorkspaceMember`, `WorkspaceRole` and `ActivityLog` models already fit.

**Workspace endpoints** (all require a session):
`GET /api/workspaces`, `POST /api/workspaces`,
`GET|PATCH|DELETE /api/workspaces/:workspaceId`.

**Membership endpoints:** `GET|POST /api/workspaces/:workspaceId/members`,
`PATCH|DELETE /api/workspaces/:workspaceId/members/:memberId`.

**Authorization matrix**

| Action | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| View workspace and members | yes | yes | yes |
| Rename workspace | yes | yes | no |
| Delete workspace | yes | no | no |
| Add MEMBER / add ADMIN | yes / yes | yes / no | no |
| Change roles | yes | no | no |
| Remove MEMBER / remove ADMIN | yes / yes | yes / no | no |
| Change or remove the OWNER membership | no | no | no |

`requireWorkspaceMember` loads the workspace and the caller's membership in one
query (404 for a missing workspace, 403 for an outsider) and puts the real
database role on `req.workspace`; `requireWorkspaceAdmin` and
`requireWorkspaceOwner` narrow it. A role sent by the client is never read.

Workspace creation runs one transaction: workspace + OWNER membership +
`WORKSPACE_CREATED` activity. Adding a member writes the membership and a
`MEMBER_ADDED` activity. Slugs are generated from the name, made unique with a
numeric suffix, and never change on rename.

New error codes: `FORBIDDEN`, `WORKSPACE_NOT_FOUND`, `MEMBER_NOT_FOUND`,
`USER_NOT_FOUND`, `ALREADY_MEMBER`, `INVALID_ROLE`,
`OWNER_MEMBERSHIP_IMMUTABLE`, `SELF_REMOVAL_NOT_ALLOWED`.

**Client routes:** `/app` is a layout that redirects to `/app/workspaces`
(list, create, loading/empty/error states); `/app/workspaces/:workspaceId`
shows details, members, and only the controls the current role may use.

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (65 tests) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` / `db:seed` / `db:check` | migration status, seed, read-only check |
| `npm run db:test:prepare` | apply migrations to the test database |
| `npm run test:auth` / `npm run test:workspaces` | server authentication / workspace tests only |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 4)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Migrations | Unchanged — no schema change was needed |
| `npm run db:test:prepare` | Passed (no pending migrations) |
| `npm run test:workspaces` | Passed (30 tests) |
| Client workspace tests | Passed (11 tests) |
| `npm run test:auth` | Passed (12 tests) |
| `npm test` | Passed — client 20, server 45 |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Manual: frontend 5174, backend 4000, `GET /api/health` public | 200 / 200 / 200 |
| Manual: `GET /api/workspaces` without a cookie | 401 |
| Manual: seeded OWNER sees only their own workspace | Passed |
| Manual: seeded MEMBER `PATCH /api/workspaces/:id` by hand | 403 |

## Known Limitations

- Test database: still the isolated PostgreSQL **schema** `devflow_test` on the
  disposable `prisma dev` server described in Phase 3 (no local PostgreSQL and
  no Docker on this machine). Its URLs in `server/.env` and `server/.env.test`
  change whenever that server is recreated.
- `prisma migrate dev` still fails against that server (`P1017`); migrations are
  produced with `prisma migrate diff` and applied with `prisma migrate deploy`.
- Workspaces: no ownership transfer, no self-service "leave workspace", no email
  invitations — only already registered users can be added, and an unknown email
  returns `404 USER_NOT_FOUND`. Renaming keeps the original slug.
- Activity rows are written (`WORKSPACE_CREATED`, `MEMBER_ADDED`) but no
  activity feed endpoint exists yet (Phase 6).
- Client data fetching is plain `useEffect` + `useState`; no React Query, no
  cache. UI styling is minimal on purpose (Phase 9).
- Still open from Phase 3: login rate limiting, email verification, password
  reset, MFA, session management and a CSRF strategy for cross-site deployment.
- No project, issue, sprint, comment or Kanban endpoints. No Docker, no CI, no
  lint tooling (Phase 8).

## Next Task

**Phase 5 — Projects and Issues.** Project CRUD scoped to a workspace, issue
CRUD scoped to a project, Zod validation on every endpoint, and authorization
that walks up to the owning workspace and reuses the Phase 4 role helpers.
