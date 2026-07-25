# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 2 — Database and Prisma — COMPLETED.**
Phase 3 (Authentication and authorization) has not started.

## Completed Work

- Phase 0: rules, architecture, roadmap, decisions, learning log.
- Phase 1: npm workspaces, React client (5174), Express server (4000),
  `/api/health`, CORS, first tests.
- Phase 2: Prisma 7 + PostgreSQL schema, initial migration, shared Prisma
  Client, idempotent seed, read-only database check, database npm scripts.

## Current Architecture

Phase 1 layout unchanged (client 5174, server 4000, npm workspaces). Added:

```
server/
├── prisma.config.ts                 schema + migrations + seed command
├── prisma/
│   ├── schema.prisma                models and enums
│   ├── migrations/20260726000000_init_devflow_schema/migration.sql
│   ├── seed.ts                      idempotent development data
│   └── check.ts                     read-only verification (db:check)
└── src/
    ├── lib/prisma.ts                single PrismaClient + pg adapter
    └── generated/prisma/            generated client (git-ignored)
```

- Prisma 7 connects through `@prisma/adapter-pg` over the `pg` driver.
- `DATABASE_URL` (and optional `SHADOW_DATABASE_URL`) live in `server/.env`;
  only `.env.example` is committed.
- `GET /api/health` still does not touch the database and keeps working while
  PostgreSQL is down. `npm run db:check` is the separate database probe.

**Models:** User, Workspace, WorkspaceMember, Project, Sprint, Issue, Comment,
ActivityLog.
**Enums:** WorkspaceRole, ProjectStatus, SprintStatus, IssueType, IssueStatus,
IssuePriority, ActivityType.
**Key constraints:** unique `User.email`, unique `Workspace.slug`, composite
unique `(workspaceId, userId)` on membership and `(workspaceId, key)` on
projects; issue sprint/assignee are nullable and set to null on delete; owner,
reporter, project creator and comment author are `Restrict`.

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm run dev` | client 5174 + server 4000 |
| `npm run typecheck` / `npm test` / `npm run build` | pass (5 tests) |
| `npm run db:validate` / `db:format` / `db:generate` | schema tooling, no database needed |
| `npm run db:migrate` | `prisma migrate dev` (needs a real PostgreSQL) |
| `npm run db:status` | migration status |
| `npm run db:seed` | idempotent seed |
| `npm run db:check` | read-only verification |
| `npm run db:studio` | Prisma Studio (manual use only) |

## Verification Status (Phase 2)

| Check | Status |
|---|---|
| `prisma format` / `prisma validate` | Passed |
| Migration `20260726000000_init_devflow_schema` | Created and applied |
| `prisma migrate status` | "Database schema is up to date" |
| Prisma Client generation | Passed |
| Seed | Passed — 3 users, 1 workspace, 3 members, 2 projects, 3 sprints, 10 issues, 3 comments, 6 activity rows |
| Seed idempotency | Passed — second run produced identical counts |
| `npm run db:check` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed (client 2, server 3), no database required |
| `npm run build` | Passed |

## Known Limitations

- No local PostgreSQL service and no Docker on this machine. Verification ran
  against a disposable local server started with `npx prisma dev --name devflow`.
  Its port changes when recreated, so `server/.env` must be updated from the
  URLs that command prints.
- `prisma migrate dev` fails against that emulated server with `P1017`. The
  initial migration was produced with `prisma migrate diff --from-empty
  --to-schema` and applied with `prisma migrate deploy` — real versioned
  migration SQL, not `db push`. On a normal PostgreSQL, use `npm run db:migrate`.
- No authentication columns yet (`passwordHash`, sessions arrive in Phase 3).
- No API endpoints read the database yet; no CRUD, no client integration.
- No Docker, no CI, no lint tooling (Phase 8).
- Tests still do not touch a database; a test database arrives in Phase 8.
- `npx prisma init` left `server/.agents`, `server/.claude`, `server/.windsurf`
  and `server/skills-lock.json` behind; they are unused and safe to delete.

## Next Task

**Phase 3 — Authentication and Authorization.** Add credential fields and a
session model via a new migration, then `POST /api/auth/register`, `login`,
`logout`, `GET /api/auth/me`, password hashing, HTTP-only cookie sessions,
`requireAuth` middleware and a workspace-role authorization helper, all
validated with Zod.
