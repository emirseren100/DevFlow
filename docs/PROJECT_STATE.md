# DevFlow — Project State

> Handover file. Read this first in a new conversation.
> Keep it short and current. Updated at the end of every phase.

**Last updated:** 2026-07-26

## Current Phase

**Phase 1 — Client and Server Scaffolding — COMPLETED.**
Phase 2 (Database and Prisma) has not started.

## Completed Work

- Phase 0: project rules, architecture plan, roadmap, decisions, learning log.
- Phase 1: npm workspaces root, React client, Express server, placeholder
  routes, health endpoint, CORS, environment examples, first tests.

## Current Architecture

```
DevFlow/
├── client/          React 19 + TypeScript + Vite 7 + React Router 7
│   ├── src/components/HealthStatus.tsx
│   ├── src/layouts/RootLayout.tsx
│   ├── src/pages/          Home, Login, Register, App, NotFound
│   ├── src/router/AppRoutes.tsx
│   ├── src/test/           setup.ts, App.test.tsx
│   ├── src/App.tsx, main.tsx, index.css
│   └── vite.config.ts      port 5174, strictPort, Vitest + jsdom
├── server/          Express 5 + TypeScript
│   └── src/  app.ts, server.ts, config.ts,
│             routes/health.ts, middleware/notFound.ts, middleware/errorHandler.ts,
│             test/health.test.ts
├── docs/
└── package.json     npm workspaces: client, server
```

- npm workspaces only — no Turborepo/Nx/Lerna.
- Frontend port **5174** (`strictPort: true`), backend port **4000**.
- CORS allows `http://localhost:5174` with `credentials: true` (ready for Phase 3 cookies).
- `app.ts` builds the Express app; `server.ts` is the only file that listens,
  so Supertest imports the app without opening a port.
- Response shapes: `{ success: true, data }` and `{ success: false, error: { message } }`.

## Working Commands (from the repository root)

| Command | Result |
|---|---|
| `npm install` | installs both workspaces |
| `npm run dev` | client on 5174 + server on 4000 via concurrently |
| `npm run typecheck` | passes, strict mode, no `any` |
| `npm test` | 5 tests pass (client 2, server 3) |
| `npm run build` | client `tsc --noEmit` + `vite build`, server `tsc` |

## Important Decisions

- npm workspaces + concurrently instead of a monorepo tool.
- `app.ts` / `server.ts` separation for testability.
- `tsconfig.build.json` on the server excludes `src/test` from the build output.
- `react-router-dom` pinned to the latest 7.x: older 7.x releases carry many
  more advisories; the single remaining advisory affects RSC mode, which this
  project does not use.

Full decision table: `docs/DECISIONS.md`.

## Known Limitations

- No database, no Prisma, no authentication, no workspaces/projects/issues.
- No Docker, no CI, no lint tooling yet (Phase 8).
- Environment handling uses plain defaults; Zod validation arrives in Phase 3.
- `HealthStatus` is a scaffolding probe, not real data fetching.
- Real `.env` files are not created; only `.env.example` on both sides.

## Next Task

**Phase 2 — Database and Prisma.** Docker Compose PostgreSQL service,
`prisma/schema.prisma` (User, Workspace, Membership, Project, Issue, Comment,
Activity), first migration, seed script, shared Prisma Client instance.

## Verification Status

| Check | Status |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | Passed (5 tests) |
| `npm run build` | Passed |
| `npm run dev` both services | Verified |
| Vite stays on 5174 | Verified (`strictPort`) |
| `GET /api/health` | Verified: `{"success":true,"data":{"status":"ok"}}` |
| Unknown API route | Verified: 404 `Route not found` |
| CORS for `http://localhost:5174` | Verified via response header |
| Database migrations | Not started |
| Docker Compose | Not started |
| CI pipeline | Not started |
| Deployment | Not started |
