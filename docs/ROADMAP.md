# DevFlow — Development Roadmap

Ten phases. Each phase ends with an updated `PROJECT_STATE.md`, a
`LEARNING_LOG.md` entry, a full test run and a successful build.
A phase is not finished until every acceptance criterion is met.

---

## Phase 0 — Project Foundation

**Goal:** Establish the project rules, the planned architecture and the
documentation that new sessions read before doing anything.

**Deliverable:** `CLAUDE.md`, `README.md`, `.gitignore`, and `docs/`
containing `ARCHITECTURE.md`, `ROADMAP.md`, `PROJECT_STATE.md`,
`DECISIONS.md`, `LEARNING_LOG.md`. No application code.

**Topics to learn:** why a project needs written constraints; how to record
architectural decisions; how to plan work in phases with acceptance criteria;
what belongs in `.gitignore` and why secrets must never be committed.

**Acceptance criteria:**
- All eight files exist and contain no contradictions.
- `CLAUDE.md` holds permanent rules only and is under 120 lines.
- The roadmap and the project state file agree on the current phase.
- No unbuilt feature is described as finished anywhere.

---

## Phase 1 — Client and Server Scaffolding

**Goal:** Get an empty but runnable client and server talking to each other.

**Deliverable:** `client/` (Vite + React + TypeScript + React Router) and
`server/` (Express + TypeScript) with their own `package.json`, strict
`tsconfig.json`, ESLint/Prettier, a `GET /api/health` endpoint, a client page
that displays the health response, CORS configured with credentials, and
`.env.example` files for both sides.

**Topics to learn:** npm scripts and dev servers; TypeScript strict compiler
options; ESM vs CommonJS in Node; Express middleware order; CORS and why
`credentials: "include"` needs an explicit origin; environment loading.

**Acceptance criteria:**
- `npm run dev` starts each side without errors.
- The client renders data fetched from `/api/health`.
- `npm run build` succeeds on both sides with zero TypeScript errors.
- No secret values are committed; only `.env.example` is tracked.

---

## Phase 2 — Database and Prisma

**Goal:** Model the domain and get a real PostgreSQL database running locally.

**Deliverable:** `docker-compose.yml` with a PostgreSQL service and a named
volume; `prisma/schema.prisma` with `User`, `Workspace`, `Membership`,
`Project`, `Issue`, `Comment`, `Activity`; the first migration; a seed script
with sample data; a single shared Prisma Client instance.

**Topics to learn:** relational modelling; one-to-many and many-to-many via a
join table with a role column; foreign keys and cascade behaviour; enums;
indexes on filtered columns; migrations as versioned history; seeding.

**Acceptance criteria:**
- `docker compose up -d` starts PostgreSQL and it accepts connections.
- `prisma migrate dev` applies cleanly on an empty database.
- The seed script runs and produces browsable data in Prisma Studio.
- Every relation is navigable in both directions from the generated client.

---

## Phase 3 — Authentication and Authorization

**Goal:** Real user accounts with HTTP-only cookie sessions and a reusable
permission layer.

**Deliverable:** `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`; password hashing; session cookie
issuing and clearing; `requireAuth` middleware; a `requireWorkspaceRole`
authorization helper; the shared error handler and the standard response shape.

**Topics to learn:** password hashing and salting; why plaintext is never
stored; cookie attributes `httpOnly`, `sameSite`, `secure`, `maxAge`; session
lifetime; the difference between 401 and 403; centralised error handling.

**Acceptance criteria:**
- Registering, logging in, reading `/me` and logging out work end to end.
- The session cookie is `httpOnly` and is not readable from `document.cookie`.
- Protected routes return 401 without a session and 403 for a wrong role.
- Wrong passwords and unknown emails return the same generic message.
- Integration tests with Supertest cover each of these paths.

---

## Phase 4 — Workspaces and Membership

**Goal:** Multi-user workspaces with roles, so all later data has an owner.

**Deliverable:** workspace create/list/read/update/delete; member invitation by
email; role assignment (`OWNER`, `ADMIN`, `MEMBER`); member removal; every
endpoint guarded by the membership check from Phase 3.

**Topics to learn:** scoping every query by the caller's memberships;
role hierarchies; preventing privilege escalation; avoiding the "last owner
removes themselves" state; idempotent invitations.

**Acceptance criteria:**
- A user sees only workspaces they belong to.
- A non-member receives 404 or 403 and never the workspace contents.
- A `MEMBER` cannot change roles or delete the workspace.
- A workspace can never end up with zero owners.
- Tests cover each role against each endpoint.

---

## Phase 5 — Projects and Issues

**Goal:** The core product — projects containing tasks and bugs.

**Deliverable:** project CRUD inside a workspace; issue CRUD inside a project
with `title`, `description`, `type` (`TASK` / `BUG`), `status`, `priority`,
`assigneeId`, `reporterId`; assignment to workspace members; list filtering by
status, type, assignee and free-text search; sorting and pagination.

**Topics to learn:** composing Prisma `where` clauses from optional query
parameters; case-insensitive search; pagination with a total count; validating
that an assignee is actually a member of the owning workspace.

**Acceptance criteria:**
- Issues can be created, edited, assigned and deleted with correct permissions.
- Filters combine correctly and an empty filter set returns everything.
- Pagination returns a correct `meta` block.
- Assigning a non-member is rejected with 400 or 403.
- Cross-workspace access attempts fail in tests.

---

## Phase 6 — Comments, Activity and Kanban

**Goal:** Collaboration and the Kanban workflow.

**Deliverable:** comment create/list/delete on an issue; an `Activity` record
written whenever an issue is created, moved, assigned or edited; an activity
feed endpoint; status transition handling and a per-status ordering value for
board columns.

**Topics to learn:** writing an audit trail without duplicating business logic;
transactions so a status change and its activity record commit together;
storing ordering for drag-and-drop; author-only deletion rules.

**Acceptance criteria:**
- Every issue mutation produces exactly one activity record.
- A status change and its activity row are written in one transaction.
- Only the comment author or a workspace admin can delete a comment.
- The activity feed is ordered newest first and is paginated.

---

## Phase 7 — Frontend Integration

**Goal:** A working user interface over the finished API.

**Deliverable:** login/register pages; a protected route wrapper; workspace and
project lists; an issue list with filters and search; an issue detail view with
comments and activity; a Kanban board with drag-and-drop between columns;
loading, empty and error states everywhere; a typed API client.

**Topics to learn:** React Router nested and protected routes; fetching with
credentials; state for server data; controlled forms and client-side
validation that mirrors the Zod rules; optimistic updates and rollback;
accessible drag-and-drop.

**Acceptance criteria:**
- A new user can register, create a workspace and a project, open an issue,
  assign it, comment on it and move it across the board — all through the UI.
- Every asynchronous view has a loading state and an error state.
- A 401 response redirects to login.
- No `any` types in the client API layer.

---

## Phase 8 — Testing, Docker, CI and Security

**Goal:** Make the project trustworthy and reproducible.

**Deliverable:** Vitest unit tests, Supertest API tests against a test database
and React Testing Library component tests; coverage reporting; Dockerfiles for
client and server plus a full `docker-compose.yml`; a GitHub Actions workflow
running lint, typecheck, tests and build on every push; security hardening
(rate limiting on auth, security headers, strict CORS, input size limits).

**Topics to learn:** test database lifecycle and isolation; what coverage does
and does not prove; multi-stage Docker builds; CI service containers;
protecting against brute force, XSS and CSRF with `sameSite` cookies.

**Acceptance criteria:**
- The full suite passes locally and in CI from a clean checkout.
- `docker compose up` brings up the whole stack and the app is usable.
- CI fails on a lint error, a type error or a failing test.
- Auth endpoints are rate limited and no secret appears in any log.

---

## Phase 9 — UI/UX, Deployment and Portfolio Preparation

**Goal:** Turn a working application into a presentable portfolio piece.

**Deliverable:** consistent visual design, responsive layout, keyboard
accessibility, empty-state illustrations and copy; a deployed public instance
with a managed PostgreSQL database; a demo account with seeded data; a final
`README.md` with screenshots, a live demo link and real setup instructions.

**Topics to learn:** production environment configuration; running migrations
on a deployed database; secure cookies across domains; basic accessibility
checks; writing a README that a reviewer can act on in five minutes.

**Acceptance criteria:**
- The live demo is reachable and the demo account works.
- The README setup instructions succeed on a clean machine.
- Screenshots and the demo link are real, not placeholders.
- The app is usable on a phone-sized viewport.
- `PROJECT_STATE.md` marks the project complete.
