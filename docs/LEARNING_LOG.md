# DevFlow — Learning Log

One entry per phase. Written at the end of the phase, while it is fresh.
The "Interview explanation" field is the point: if it cannot be explained in a
few plain sentences, it is not learned yet.

## Entry Template

```markdown
## Phase N — <title>

**Phase:** N — <title> (<date>)

**Concepts learned:**
- <concept> — <one line on what it actually means>

**Files understood:**
- `<path>` — <what it does and why it exists>

**Problems solved:**
- <problem> — <cause> — <fix>

**Interview explanation:**
<3–5 sentences answering "what did you build in this phase and why that way",
written as if speaking to an interviewer with no context on the project.>
```

---

## Phase 0 — Project Foundation

**Phase:** 0 — Project Foundation (2026-07-25)

**Concepts learned:**
- Written project rules — a `CLAUDE.md` keeps constraints stable across
  sessions instead of relying on memory of past conversations.
- Architecture decision records — writing down *why* a technology was chosen,
  and what was rejected, prevents re-arguing the same decision later.
- Phased planning with acceptance criteria — a phase has an objective
  finish line, so "done" is a check, not a feeling.
- Handover documentation — `PROJECT_STATE.md` lets a new session resume work
  by reading one short file.
- `.gitignore` and secrets — `.env` is ignored while `.env.example` is
  tracked, so the required keys are documented without leaking values.

**Files understood:**
- `CLAUDE.md` — permanent working rules; read at the start of every session.
- `docs/ARCHITECTURE.md` — planned client/server split, data flow, auth model,
  validation boundaries and response shape.
- `docs/ROADMAP.md` — ten phases, each with a goal, deliverable, topics and
  acceptance criteria.
- `docs/PROJECT_STATE.md` — the handover file; the only file describing what is
  true right now.
- `docs/DECISIONS.md` — decision table with reasons and rejected alternatives.
- `README.md` — public-facing description; currently marked as planning stage.
- `.gitignore` — ignores dependencies, build output, coverage, generated Prisma
  client, environment files, IDE and OS junk.

**Problems solved:**
- Documentation drifting out of sync — solved by making `PROJECT_STATE.md` the
  single place that describes current reality, and by requiring an update at
  the end of every phase.
- README overstating progress — solved by an explicit "Current Status" section
  and by labelling unfinished sections as placeholders.

**Interview explanation:**
Before writing any code I set up the project's rules and plan. I wrote down the
technology stack with a reason for each choice and the alternatives I rejected,
split the work into ten phases where each phase has explicit acceptance
criteria, and created a short state file that describes exactly what exists
today. The reason is that this project is built across many separate working
sessions: without written constraints and a handover file, the architecture
drifts and decisions get silently re-made. It also gives me a real answer when
someone asks why I chose PostgreSQL over MongoDB or cookies over localStorage
tokens.

---

## Phase 1 — Client and Server Scaffolding

**Phase:** 1 — Client and Server Scaffolding (2026-07-26)

**Concepts learned:**
- npm workspaces — one root `package.json` lists `client` and `server`, so a
  single `npm install` installs both and shared packages are hoisted into one
  `node_modules`. Root scripts delegate with `npm run <script> --workspace <name>`.
- Frontend/backend separation — the browser code and the server code are two
  independent programs that only meet over HTTP. The client never touches the
  database, so the server stays the single place where rules are enforced.
- Vite's role — a dev server that serves source files over native ES modules
  (instant startup, hot reload) and a bundler that produces the optimized
  `dist/` for production. `strictPort: true` makes it fail instead of silently
  moving to another port, which would break the server's CORS origin.
- Express app vs network listener — `app.ts` builds the app object, `server.ts`
  calls `app.listen`. Tests import the app and never open a real port, so tests
  are fast and cannot collide on port 4000.
- CORS — the browser blocks cross-origin requests unless the server says the
  origin is allowed. 5174 and 4000 are different origins, so the server sends
  `Access-Control-Allow-Origin: http://localhost:5174`. `credentials: true` is
  already set, because cookie sessions in Phase 3 need it.
- Environment variables — values that change per machine live outside the code.
  The server reads them in one file (`config.ts`); the client only sees
  `VITE_`-prefixed ones, which end up in public JavaScript and therefore must
  never hold secrets. Only `.env.example` is committed.
- Health endpoints — a trivial `GET /api/health` returning `{ status: "ok" }`
  proves the process is up and reachable. Load balancers and uptime checks use
  exactly this; here it also proved CORS works end to end.
- Smoke tests — one cheap test asserting the app shell renders. It catches
  "everything is broken" instantly. It queries visible text and roles, so a
  refactor of class names or internal state does not break it.
- Supertest integration tests — Supertest sends a real HTTP request into the
  imported Express app in memory. That exercises routing, middleware order and
  the JSON response shape, not just an isolated function.
- Root workspace scripts — `dev`, `build`, `typecheck` and `test` run from the
  repository root; `concurrently` runs the two dev processes side by side with
  labelled, colored output.

**Files understood:**
- `package.json` (root) — workspaces list and the four delegating scripts.
- `client/vite.config.ts` — React plugin, fixed port 5174, Vitest + jsdom setup.
- `client/src/router/AppRoutes.tsx` — route table; the router provider lives in
  `main.tsx` so tests can supply a `MemoryRouter`.
- `server/src/app.ts` — CORS, JSON parsing, `/api` router, 404, error handler,
  in that order; middleware order decides which handler sees a request.
- `server/src/config.ts` — the only file reading `process.env`.
- `server/tsconfig.build.json` — build config that excludes tests from `dist/`.

**Problems solved:**
- Tests would have needed a live server — solved by splitting `app.ts` from
  `server.ts` and importing the app directly in Supertest.
- A dependency advisory on `react-router-dom` — checked the actual versions
  instead of guessing: an older 7.x carried far more advisories, so the latest
  7.x is the safer choice and its remaining advisory covers RSC mode, which
  this project does not use.
- Windows compatibility — scripts use `npm run ... --workspace ...` and `&&`
  only, no Unix-only shell syntax.

**Interview explanation:**
In this phase I built the skeleton both halves of the app hang off. The
repository is one npm workspace with a `client` and a `server` package, so one
install and one set of root commands cover both. The client is a Vite + React +
TypeScript app with placeholder routes and a fixed dev port; the server is an
Express API that exposes `GET /api/health` and returns a consistent JSON shape
for both success and errors. The detail I would highlight is separating the
Express app object from the code that opens the port: it lets integration tests
fire real HTTP requests at the app without starting a server, which keeps the
test suite fast and free of port conflicts.

---

## Phase 2 — Database and Prisma

**Phase:** 2 — Database and Prisma (2026-07-26)

**Concepts learned:**
- Relational database — data lives in tables of rows and columns, and the
  database itself enforces the rules. If a rule can be expressed as a
  constraint, the application cannot break it by accident.
- Primary key — the column that identifies a row uniquely. Here every model
  uses a string `id` with `@default(cuid())`, so ids can be generated by the
  application and are not guessable counters.
- Foreign key — a column holding another table's primary key. `Issue.projectId`
  points at `Project.id`; PostgreSQL refuses an issue whose project does not
  exist.
- One-to-many — one project has many issues; the "many" side stores the foreign
  key. There is no list column on the project row.
- Explicit many-to-many — a user belongs to many workspaces and a workspace has
  many users, so a third table (`WorkspaceMember`) sits between them. It is
  explicit because it carries its own data: `role` and `joinedAt`.
- Unique constraint — the database rejects duplicates. `User.email` and
  `Workspace.slug` are unique.
- Composite unique constraint — uniqueness across a combination of columns.
  `(workspaceId, userId)` stops the same person joining a workspace twice, and
  `(workspaceId, key)` lets two workspaces both have a project keyed `API`.
- Index — a lookup structure that makes filtered queries fast, at the cost of
  slightly slower writes and extra space. Indexes were added only where the app
  will actually filter: issues by project/status/position, by assignee, by
  sprint; activity by workspace/project/issue and time.
- Nullable relation — an optional link. `assigneeId` and `sprintId` are
  nullable because an issue really can exist with nobody on it and no sprint.
  `onDelete: SetNull` then means "deleting the sprint must not delete the work".
- Referential actions — `Cascade` deletes children with their parent (comments
  with an issue), `SetNull` clears the link, `Restrict` blocks the delete. The
  owner, reporter, project creator and comment author use `Restrict`, so a user
  row can never be silently removed underneath real work.
- Database enum — a column whose allowed values are fixed in the database
  (`IssueStatus`, `WorkspaceRole`, …). Prisma generates a matching TypeScript
  type, so one definition guards both layers.
- Migration — a committed SQL file describing a schema change. Running the
  migrations in order rebuilds the exact same database anywhere. This is why
  `db push`, which mutates a database with no history, is not the workflow.
- Seed data — a small, realistic development dataset. This seed is idempotent:
  fixed `seed_*` ids plus `upsert` mean running it twice updates the same rows
  instead of duplicating them.
- Prisma Client — the generated, typed query API. Created once in
  `src/lib/prisma.ts`; Prisma 7 reaches PostgreSQL through the `pg` driver
  adapter.
- Prisma schema vs PostgreSQL tables — `schema.prisma` is the model definition
  in Prisma's language; the tables are what actually exists in PostgreSQL.
  `prisma migrate` translates one into the other, and `@@map` is why the model
  `WorkspaceMember` lives in a table named `workspace_members`.

**Files understood:**
- `server/prisma/schema.prisma` — models, enums, constraints, indexes and
  referential actions.
- `server/prisma.config.ts` — Prisma 7 config: schema path, migrations folder,
  seed command and the datasource URL from the environment.
- `server/src/lib/prisma.ts` — one client for the process, cached on
  `globalThis` so `tsx watch` reloads do not open a new pool each time.
- `server/prisma/seed.ts` — deterministic upsert-based development data.
- `server/prisma/check.ts` — read-only counts and relation checks behind
  `npm run db:check`.

**Problems solved:**
- The health endpoint must not depend on the database — kept `app.ts` free of
  Prisma imports, so a database outage cannot make the API look dead, and the
  test suite still runs with no PostgreSQL at all.
- No PostgreSQL and no Docker on the machine — used the disposable local server
  from `npx prisma dev`. `prisma migrate dev` fails against it (`P1017`), so the
  initial migration was generated with `prisma migrate diff --from-empty
  --to-schema` and applied with `prisma migrate deploy`; the result is still a
  committed, versioned migration file rather than `db push`.
- Strict TypeScript rejected `url: process.env['DATABASE_URL']` under
  `exactOptionalPropertyTypes` — handled with an explicit fallback instead of
  loosening the compiler.

**Interview explanation:**
In this phase I designed the relational model and wired it up with Prisma and
PostgreSQL. Eight tables cover users, workspaces, membership with roles,
projects, sprints, issues, comments and an activity log. The interesting
decisions are the join table for membership — because membership carries a role,
an implicit many-to-many could not hold it — and the delete rules: comments
cascade with their issue, an issue survives its sprint by having the link set to
null, and anything pointing at a user is restricted so accounts cannot be
deleted out from under real work. Schema changes go through committed migration
files, and there is a small idempotent seed plus a read-only check script so any
developer can confirm their database is set up correctly in one command.

## Phase 3 — Authentication

**What I learned:**

- Hashing vs encryption — encryption is two-way: with the key you get the
  original back. Hashing is one-way: there is no "unhash". Passwords are hashed
  precisely because nobody, including us, should ever be able to read them back;
  we only check whether a new attempt hashes to the same value.
- Argon2id — a *slow on purpose* password hash. It deliberately burns memory and
  CPU, so an attacker with a stolen database can only try a few thousand guesses
  a second instead of billions. The `id` variant mixes the two Argon2 modes to
  resist both GPU cracking and side-channel attacks. It is today's default
  recommendation for passwords.
- Session tokens — after login the server hands the browser a long random
  string. It is *opaque*: it means nothing by itself, it is just a lookup key
  for a row in the `sessions` table. Nothing about the user is encoded in it, so
  nothing can be read out of it or faked into it.
- Token hashing — the session table stores only `SHA-256(token)`. Whoever reads
  the table sees hashes, and a hash cannot be sent as a cookie to log in. Fast
  SHA-256 is right here, unlike for passwords, because the input is already 32
  random bytes: there is nothing to guess, so slowness would buy nothing and
  would cost time on every request.
- HTTP-only cookies — `httpOnly` tells the browser "store this, send it with
  requests, but never expose it to `document.cookie`". Malicious injected
  JavaScript therefore cannot read the session, which is the exact weakness of
  keeping a token in `localStorage`.
- SameSite and Secure — `SameSite=Lax` stops the browser from attaching the
  cookie to requests coming from other sites, which blocks the classic CSRF
  shape. `Secure` means "only over HTTPS"; it is enabled in production only, so
  plain `http://localhost` still works in development.
- Authentication vs authorization — authentication is *who are you*
  (a valid session), authorization is *are you allowed to do this*
  (workspace membership and role). Phase 3 implemented only the first.
- 401 vs 403 — `401 Unauthorized` really means *unauthenticated*: log in and try
  again. `403 Forbidden` means we know exactly who you are and the answer is
  still no. Sending 403 for a missing session would tell the client to stop
  trying instead of showing a login form.
- Protected routes — the client guard is only about user experience: it decides
  whether to show a spinner, the page, or a redirect to `/login`. It is not
  security. Anyone can edit the JavaScript in their own browser, so the real
  check is `requireAuth` on the server, on every request.
- Database-backed sessions — because each session is a row, logging out deletes
  it and the very next request is rejected. A signed token like a JWT cannot be
  taken back before it expires without adding a blocklist — which is a database
  lookup again, just with more steps.
- Test database isolation — the auth tests create and delete real rows, so they
  need their own database. `server/.env.test` points at one whose name contains
  `devflow_test`, and the setup refuses to run if it does not, so a wrong URL
  cannot delete development data.

**Files understood:**
- `server/src/modules/auth/auth.service.ts` — Argon2id hashing, token
  generation, SHA-256 storage, cookie options.
- `server/src/modules/auth/auth.middleware.ts` — `attachSession` reads and
  validates the cookie, `requireAuth` turns a missing session into `401`.
- `server/src/modules/auth/auth.routes.ts` — the four endpoints and the Zod to
  field-errors translation.
- `client/src/auth/AuthProvider.tsx` — one `GET /api/auth/me` on mount restores
  the session; `client/src/auth/RequireAuth.tsx` guards `/app`.
- `server/prisma/testDbUrl.ts` — the safety guard that refuses any database
  whose URL does not name `devflow_test`.

**Problems solved:**
- The first design instinct was a `passwordHash` column on `User`. Splitting it
  into a `PasswordCredential` table means a routine user query cannot leak the
  hash, and the column is never nullable-but-really-required.
- Login could leak which emails exist, through the message *and* through timing
  (no user = no hashing = a fast answer). Fixed with one shared error message
  and a dummy hash verification for unknown emails.
- Prisma 7 moved `--shadow-database-url` out of `migrate diff` into
  `prisma.config.ts`, and the migrations folder needed a `migration_lock.toml`
  before `--from-migrations` would work.
- A second `prisma dev` server never finished starting on this machine, so the
  test database is an isolated PostgreSQL **schema** (`devflow_test`) on the
  same disposable server. Different schema, different tables, same guard.
- Adding the auth provider broke a Phase 1 test that expected `/login` to render
  synchronously; it now waits for the session check, which is what a user sees.

**Interview explanation:**
This phase added email and password authentication with server-side sessions.
Passwords are hashed with Argon2id and kept in their own table, away from the
profile data. On login the server generates 32 random bytes as an opaque session
token, stores only its SHA-256 hash in a `sessions` row, and returns the raw
token in an HTTP-only, SameSite=Lax cookie — so the browser sends it
automatically and page JavaScript can never read it. Every protected request
hashes the incoming cookie, looks up the session, rejects it if it has expired,
and attaches only the safe user fields. Because sessions are rows, logout is a
delete and takes effect immediately, which is the main thing a JWT cannot do.
The failure message for a wrong password and an unknown email is identical, so
the API does not reveal who has an account. It is covered by integration tests
against a dedicated test database that the setup refuses to run without.

---

## Phase 4 — Workspaces, Membership and Role-Based Authorization

**Phase:** 4 — Workspaces and Membership (2026-07-26)

**Concepts learned:**
- Multi-tenant design — one database and one set of tables serve many
  independent teams; every row belongs to a workspace, and every query is
  filtered by the workspace the caller may actually see. The isolation is
  enforced by the queries, not by separate databases.
- Ownership versus membership — `Workspace.ownerId` says who created it;
  `WorkspaceMember` says who may enter and with which role. Access is granted
  only by the membership row, so the creator gets one too. One rule to check
  instead of "member or owner" scattered everywhere.
- Role-based authorization (RBAC) — permissions attach to a role
  (`OWNER`/`ADMIN`/`MEMBER`), not to a person, so "what may an admin do" is
  answered in one place and adding a user never means editing permission lists.
- Authentication versus authorization — authentication answers *who are you*
  (401 when there is no answer); authorization answers *may you do this here*
  (403 when the answer is no). The same user is authenticated everywhere but
  authorized differently per workspace.
- 401 versus 403 — 401 means "log in and try again"; 403 means "you are logged
  in and it still will not happen". Returning 401 for a permission problem sends
  the client into a pointless login loop.
- Database transactions — `prisma.$transaction` makes several writes one
  all-or-nothing unit. Creating a workspace writes the workspace, the OWNER
  membership and the activity row together, so a crash cannot leave a workspace
  nobody can administer.
- Composite unique constraints — `@@unique([workspaceId, userId])` lets the
  database itself reject a second membership for the same person in the same
  workspace, including two requests arriving at the same millisecond. A check in
  application code alone cannot promise that.
- Server-side enforcement — the client is not a trusted source. Roles are read
  from PostgreSQL on every request; a role sent in a body, a header or React
  state is ignored.
- Hiding a button is not security — the UI hides controls a role may not use, but
  that is user experience. Anyone can send the request with `curl`, so the same
  rule is checked again on the server. The client rule is a convenience copy.
- Safe response shapes — member endpoints return `id`, `name`, `email`, role and
  join date only. Password hashes and sessions live in their own tables and are
  never selected, so they cannot leak by accident.

**Files understood:**
- `server/src/modules/workspaces/workspace.authorization.ts` — loads the
  workspace and the caller's membership in one query, then the small
  `requireWorkspaceMember` / `requireWorkspaceAdmin` / `requireWorkspaceOwner`
  gates plus the two rules that depend on the target's role.
- `server/src/modules/workspaces/workspace.service.ts` — Prisma queries, slug
  generation, the creation transaction and the OWNER invariants.
- `server/src/modules/workspaces/workspace.schemas.ts` — Zod at the API edge;
  `OWNER` is deliberately not an assignable role.
- `client/src/lib/workspaceApi.ts` — typed calls over the existing fetch wrapper,
  plus the permission helpers that decide which controls are rendered.

**Problems solved:**
- Slugs must be unique globally, but two people can create "Acme" at the same
  moment. The server picks the first free suffix and, if it still loses the race
  on the unique index, retries instead of failing the request.
- An outsider asking for a workspace must not learn what is inside it. A missing
  workspace is 404, an existing one without a membership is a plain 403 with no
  detail either way.
- A member id from another workspace could be pasted into this workspace's URL,
  so the lookup filters by `workspaceId` **and** member id — the answer is
  `MEMBER_NOT_FOUND`, not somebody else's data.
- Prisma logged the expected duplicate-membership error as a database error. A
  membership check before the insert keeps the logs clean, while the unique
  index and the `P2002` handler still cover the race.
- The `/app` page became a small layout with the workspace pages nested inside,
  so the existing authentication tests kept passing unchanged.

**Interview explanation:**
This phase turned a single-user app into a multi-tenant one. Data belongs to a
workspace, and a user reaches a workspace only through an explicit membership row
that carries a role: OWNER, ADMIN or MEMBER. Creating a workspace writes the
workspace, the creator's OWNER membership and an activity record in one
transaction, so a workspace without an administrator cannot exist. Every
protected request first answers "who is this?" from the session cookie, then
separately "what may this person do in this workspace?" by loading their
membership from PostgreSQL — the role is never taken from the client. Missing
authentication is 401, insufficient permission is 403. The database enforces what
it can: a composite unique constraint on workspace plus user makes a double
membership impossible even under concurrent requests. The UI hides controls a
role cannot use, but that is only convenience; the same rules are re-checked
server-side, which is what the integration tests verify by sending forbidden
requests directly.

## Phase 5 — Projects, Sprints and Issues

**Phase:** 5 — Projects, Sprints and Issues (2026-07-26)

**Concepts learned:**
- Nested REST resources — the URL spells out the ownership chain:
  `/workspaces/:workspaceId/projects/:projectId/issues/:issueId`. Each segment is
  a resource that owns the next one, so the address itself says where a record
  lives instead of hiding that in a query parameter.
- Route ownership validation — a nested URL is a claim, not a proof. A project id
  is a valid key on its own, so swapping the workspace id in the address bar
  would otherwise reach another team's project. Every lookup therefore includes
  the parent id in the `where` filter (`{ id: projectId, workspaceId }`), and a
  mismatch answers 404 rather than data.
- Server-side filtering — `search`, `status`, `type`, `priority`, `assigneeId`,
  `sprintId` and `unassigned` are parsed with Zod and turned into one Prisma
  `where` object. Filtering in the database means the response only carries rows
  the user asked for; filtering in the browser would still ship everything.
- Pagination — `page` and `limit` become `skip` and `take`, with the limit capped
  at 100. The response carries `total`, `totalPages` and the two `has…Page`
  flags, so the UI can draw pager controls without guessing.
- Transactions — creating an issue writes two things that must agree: the new
  issue and the project's counter. `prisma.$transaction` makes them one
  all-or-nothing unit, so a crash can never leave a counter that has moved past
  an issue that was never created.
- Race conditions — two requests arriving at the same millisecond can both read
  "there are 7 issues" and both write number 8. Incrementing the counter *inside*
  the transaction makes PostgreSQL lock that project row, so the second request
  waits and reads 8 instead of 7. `count + 1` computed before the transaction has
  no such protection.
- Project-scoped sequence numbers — the counter lives on the project, not on the
  whole database, which is why `API-1` and `WEB-1` both exist. A unique index on
  `(projectId, number)` lets the database enforce the rule even if future code
  forgets the transaction.
- Derived versus stored values — the display key `API-14` is built from the
  project key and the issue number when a response is assembled. Storing it as a
  third column would create a copy that can drift out of sync.
- Relational validation — an assignee must have a membership row in the issue's
  workspace and a sprint must belong to the same project. Both are checked
  against the database before the write, because a request body can name any id.
- Reporter versus assignee — two relations to the same `User` model answering
  different questions: who asked for the work (always the signed-in user, never a
  body field) and who is doing it (optional, changeable, and a permission in
  itself, since the assignee may edit the issue).
- Immutable identifiers — the project key is fixed after creation, because
  `API-14` is written into chats, commits and bookmarks that the application
  cannot rewrite. The name and description stay editable.
- Authorization based on resource relationships — a MEMBER may edit an issue when
  they are its reporter or its current assignee. The permission therefore depends
  on the row, not only on the role, so the issue is loaded first and the rule is
  applied to the real `reporterId` and `assigneeId`.

**Files understood:**
- `server/src/modules/projects/project.authorization.ts` — `requireProject`, the
  one middleware that proves a project belongs to the workspace in the URL.
- `server/src/modules/issues/issue.service.ts` — the filter/pagination query and
  the transaction that allocates an issue number.
- `server/src/modules/issues/issue.authorization.ts` — role-plus-relationship
  rules and the `permissions` object the client renders from.
- `server/src/lib/parseQuery.ts` — query strings fail as `INVALID_SORT` or
  `INVALID_FILTER` instead of a form-shaped `VALIDATION_ERROR`.
- `client/src/pages/ProjectDetailPage.tsx` — filters kept in the URL query
  string, which is what makes a filtered view shareable and reloadable.

**Problems solved:**
- Adding `Issue.number` to a table that already had rows: the migration creates
  the column with a temporary default, numbers the existing issues per project
  with `ROW_NUMBER()`, moves each project counter past its highest number, then
  drops the default and adds the unique index. No development data was reset.
- Two Prisma models can be counted in one query: issue totals per project come
  from a single `groupBy`, so a list of ten projects is two queries, not eleven.
- Sprint ordering — PostgreSQL sorts an enum in declaration order (PLANNED,
  ACTIVE, COMPLETED), which is not board order. The short sprint list is sorted
  in TypeScript with an explicit rank instead.
- A no-op update used to write an activity row anyway. The service compares each
  incoming field with the stored value first, so saving an unchanged form writes
  nothing.
- The local disposable `prisma dev` server drops connections past a couple, which
  produced protocol errors and spurious 403s under parallel requests. Plain `pg`
  reproduced it without Prisma, so the fix was a `DATABASE_POOL_MAX` setting
  rather than a change to the application logic.
- URL-driven filters can loop forever if the effect that reads the URL also
  writes it. Here the URL is written only by user actions and the effect only
  reads it, so there is no cycle.

**Interview explanation:**
Phase 5 added the core of the product: projects inside a workspace, sprints and
issues inside a project. The URLs are nested to match that ownership, but a
nested URL is only a claim — every lookup includes the parent id in the query, so
changing a workspace id in the address bar returns 404 instead of another team's
project. Issues get human-readable keys such as API-14: the key belongs to the
project, the number comes from a counter on the project row, and the two are
joined only when a response is built. The number is allocated inside the same
transaction that creates the issue, which makes PostgreSQL lock the project row
and serialise concurrent requests; a unique constraint on project plus number is
the backstop. Counting existing issues instead would be a classic race
condition. Permissions come in two flavours here: role-based for projects and
sprints, and relationship-based for issues, where a plain member may edit the
issue they reported or are assigned to. The issue list is filtered, sorted and
paginated in the database, capped at 100 rows per request, and the client keeps
those filters in the URL query string so a view can be reloaded or shared.

## Phase 6 — Comments, Activity and Kanban

**Phase:** 6 — Comments, activity feed and Kanban workflow (2026-07-26)

**Concepts learned:**
- Comments as relational data — a comment is a row with two foreign keys
  (`issueId`, `authorId`), not a text blob on the issue. That is what makes
  "who wrote it", "sort by time" and "delete only mine" ordinary queries. The
  cascade rules encode intent: deleting an issue deletes its comments, while a
  user who still has comments cannot be deleted, so no comment loses its author.
- Audit/activity logs — an append-only table of *what happened*. Nothing updates
  or deletes a row, and only meaningful state changes are recorded (never reads,
  filters or failed validations). It answers "what changed here, by whom, when?"
  without inspecting every table.
- Structured metadata versus formatted text — the row stores
  `{ previousStatus: "TODO", nextStatus: "IN_PROGRESS" }`, not the sentence
  "Ada moved API-2 to In Progress". The wording is built in the client, so it can
  change (or be translated) without a migration and without rewriting history.
  On the way out the metadata is filtered against a key whitelist, so a careless
  future writer cannot leak anything through a feed.
- Authorization on nested resources — every level is re-proved in the database:
  the user is a member of the workspace, the project belongs to that workspace,
  the issue belongs to that project, the comment belongs to that issue. A URL is
  a claim; the `where` filter is the proof.
- Asymmetric permissions — editing and deleting are not the same right. Only the
  author may rewrite their words; the author, OWNER and ADMIN may delete them.
  Moderation is not authorship.
- Ordering with an integer position — the board column is `status`, the place
  inside it is `position`, renumbered `0, 1, 2, …` after every move. Contiguous
  integers are easy to read, to test and to explain, and the alternatives
  (fractional positions, linked lists) each buy fewer writes with more ways to
  corrupt an order.
- Server-owned ordering — the client sends `issueId`, `targetStatus` and
  `targetIndex`, nothing else. The server reads the real order and writes the
  result, so a hand-made request cannot reorder other people's cards. Trusting a
  client-sent list of ids would be trusting the one thing that can be edited.
- Database transactions — one move rewrites several rows in two columns. Wrapped
  in `prisma.$transaction`, it is all-or-nothing: a crash halfway leaves the
  previous order untouched instead of duplicate positions.
- Race conditions and isolation — two people reordering the same column can both
  read the same "before" state and write conflicting positions. `Serializable`
  isolation makes PostgreSQL refuse that interleaving; the refusal arrives as
  Prisma error `P2034`, which is retried a small, bounded number of times. A
  bounded retry is a fix; an unbounded one is a hang.
- Optimistic UI and rollback — the card moves immediately, the previous board is
  kept in a variable, and the server's confirmed board replaces the local one. On
  failure the saved board is restored and the error shown, so a rejected move
  never leaves a duplicated or missing card. Optimistic UI without a rollback is
  just a lie that is usually true.
- Drag-and-drop state — the library only reports "this card was dropped over
  that one". Translating that into "status X, index N" and then into one request
  is application logic; the library holds no truth about the data.
- Accessible alternatives to dragging — a pointer gesture cannot be the only way
  to change a status. Every movable card also has a labelled "Move … to" select
  and a keyboard-reachable drag handle, and each card announces its identity and
  its current column.
- Why the MVP needs no WebSockets — realtime means a second protocol, connection
  state, reconnection, per-message authorization and a much harder test story.
  The value here is correct, authorized, durable ordering, which one HTTP
  transaction already delivers. Another person's move appears on reload.

**Files understood:**
- `server/src/modules/comments/comment.authorization.ts` — why edit and delete
  have different rules.
- `server/src/modules/kanban/kanban.service.ts` — the whole move: read the real
  order, clamp the index, renumber both columns, log one activity, all inside one
  serializable transaction with a bounded retry.
- `server/src/modules/activities/activity.service.ts` — the metadata whitelist
  and the deterministic `createdAt`/`id` ordering that makes paging stable.
- `client/src/pages/BoardPage.tsx` — optimistic move plus rollback, and the
  fallback control next to the drag handle.
- `client/src/lib/activityText.ts` — structured fields turned into sentences in
  the client.

**Problems solved:**
- `updatedAt` moves on every save, so a brand new comment already looked edited.
  The "(edited)" marker uses a one-second tolerance instead of an exact compare.
- Positions used to be seeded and created as project-wide values (the issue
  number), which is not what a column-local order means. Creating an issue now
  counts the issues already in its target column, and the seed uses per-column
  values, so the board is contiguous from the first run.
- A status change through the ordinary `PATCH .../issues/:issueId` endpoint left
  the old column's position behind. It now moves the issue to the end of its new
  column inside the same transaction.
- A same-column reorder should not read as a status change, so no activity row is
  written for it; a cross-column move writes exactly one
  `ISSUE_STATUS_CHANGED`.
- The shared activity feed component refetched endlessly because the parent
  passed a new `load` function on every render. Wrapping it in `useCallback` made
  the dependency honest instead of removing it from the dependency list.

**Interview explanation:**
Phase 6 added the collaborative layer: comments, an activity feed and a Kanban
board. Comments are a normal relational table with an author and an issue, and
their permissions are deliberately asymmetric — only the author may edit their
own words, while the author, OWNER and ADMIN may delete them. The activity log is
append-only and stores structured metadata rather than sentences, so the readable
line ("Ada moved API-2 from To Do to In Progress") is generated in the client and
the wording can change without a migration; on the way out the metadata passes a
key whitelist so nothing leaks through a feed. The board is `status` for the
column and an integer `position` for the place inside it. The interesting part is
who owns the order: the client sends only the issue, the target status and the
target index, and the server reads the real order, clamps the index, renumbers
both affected columns and writes the status-change activity in one serializable
transaction, retried a couple of times if PostgreSQL reports a write conflict.
That is what makes concurrent reorders safe and makes a failed move a no-op. On
the client the move is optimistic with a real rollback to the previous board, and
dragging is never the only way to move a card — every movable card also has a
keyboard-accessible "Move to" control, while the hidden drag handle for cards the
user may not move is convenience, not security, because the server checks the row
again. Realtime updates are deliberately deferred: a WebSocket layer would add a
protocol, connection state and per-message authorization for a benefit the MVP
does not need.

## Phase 7 — Dashboard, Application Shell and Frontend Integration

**Phase:** 7 — Dashboard, application shell and frontend integration (2026-07-26)

**Concepts learned:**
- Client state versus server state — they look alike and behave nothing alike.
  Client state is owned by the browser: a form draft, "is this menu open", the
  current filter. It is always correct, because nobody else can change it.
  Server state is a *copy* of something PostgreSQL owns: a project list, an
  issue, a member count. The moment it is read it can already be out of date,
  and someone else can change it without telling you. So it needs a cache, a
  notion of staleness and a way to refresh — which is exactly what a client
  state tool like Redux does not give you.
- TanStack Query — a cache for server state, keyed by a query key. It gives
  every screen the same four outcomes (`isPending`, `isError`, empty, data) for
  free, shares one request between all the components that ask for the same
  key, and knows how to mark data stale after a write. It is not a request
  library: `fetch` still does the request.
- Query keys — the address of a piece of server data in the cache. Two
  components with the same key see the same data and cause one request; two
  different keys are two different things. Keys are matched by *prefix*, which
  is why `['workspaces','detail','w1']` also matches everything below it, and
  why writing keys in one factory file instead of inline is what makes
  invalidation reliable.
- Caching and stale data — cached data is served immediately, then refreshed if
  it is older than `staleTime`. That is why navigating back to a page is
  instant instead of showing a spinner again. The trade is that data can be a
  few seconds old, which is fine for a dashboard and would not be for a bank
  balance.
- Invalidation — "this data may have changed, fetch it again next time it is
  needed". After a mutation you invalidate the keys the write actually affected,
  not the whole cache: adding a member touches the members, the workspace and
  the dashboard, and nothing else. Invalidating everything works and is lazy —
  it turns one write into a dozen requests.
- Mutation lifecycle — `onMutate` (optionally update the cache optimistically
  and keep the previous value), `onError` (put the previous value back),
  `onSuccess` (write the confirmed server answer, then invalidate). The Kanban
  move uses all three, which is why a refused move can never leave a duplicated
  or missing card.
- Nested layouts — one route renders the shell and its children render into an
  outlet. The shell mounts once, so the header, the switcher and the navigation
  are not rebuilt on every navigation, and no page has to remember to draw the
  frame around itself.
- Dashboard aggregation — one endpoint that answers a whole screen. The
  alternative is six list requests that arrive at six different moments and
  describe six slightly different states. Counting happens in PostgreSQL with
  `count` and `groupBy`, so the response is a handful of numbers instead of
  every issue in the workspace.
- Loading, error and empty states — four outcomes, not two. "No data" is not an
  error and must explain the next useful action; a blank screen while loading
  looks like a bug; and an error message must say what happened without leaking
  a stack trace or a server internal.
- URL state — the filters live in the query string, so the browser's back
  button, a reload and a pasted link all work. The URL is a piece of state the
  user can edit, share and bookmark, which no `useState` can be.
- Avoiding N+1 — on the server it means not running one query per row (`groupBy`
  instead of a count per project). On the client it means not firing the same
  request from every nested component: one query key, one request, shared.
- Responsive application shells — structural responsiveness first. One
  breakpoint decides whether the navigation stands beside the content or
  collapses behind a labelled `Menu` button with `aria-expanded`; cards wrap on
  their own with a grid; the five-column board scrolls sideways instead of being
  squeezed. None of that is visual design, and all of it is required for the
  page to be usable at 390px.

**Mistakes and corrections:**
- Query keys were nested so naturally that `project(w, p)` turned out to be the
  prefix of the board, the issues and the feeds below it. Invalidating the
  project after a Kanban move therefore refetched the board and threw away the
  confirmed answer that had just been written into the cache. The fix was to be
  explicit: `exact: true` when only the detail changed, and separate `…Lists`
  keys when only the lists did.
- The first `QueryClient` was a module-level constant. Every test then shared
  one cache, so a test could see data another test had loaded. Creating it in
  `useState` inside the App component gives each mounted application — one in
  the browser, one per test — its own cache.
- Existing component tests assumed the old behaviour where a successful write
  updated a local array. With a cache the list is re-read from the server
  instead, so the mocks had to become stateful. That is a better test: it now
  proves the screen shows what the server actually has.

**Interview explanation:**
Phase 7 turned a set of working pages into one application. Everything behind
`/app` renders inside a single shell — brand, workspace switcher, workspace
navigation, current user, sign out — using React Router nested layouts, so the
frame mounts once and each page contributes only its own content and its own
`<h1>`. The bigger change is that server data moved out of `useEffect` into
TanStack Query. The distinction that matters is client state versus server
state: a form draft is owned by the browser and is always right, while a project
list is a copy of something the database owns and can be stale the instant it
arrives. TanStack Query gives that copy a key, a cache, a staleness rule and an
invalidation story, which is why the same workspace list is fetched once for the
switcher and every nested page instead of once per component. All keys come from
one factory file, because invalidation is only correct if two places agree on
the exact key, and after a mutation only the affected keys are invalidated —
adding a member refreshes the members, the workspace and the dashboard, and a
Kanban move refreshes the board plus, only if the status really changed, the
issue, the lists, the feeds and the metrics. Retries are off on purpose: a 401,
403 or 404 is a correct answer, not flakiness, so the error state offers a
visible "Try again" instead. The dashboard itself is one endpoint rather than
six requests, so the numbers describe one consistent moment; they are computed
with Prisma `count` and `groupBy` in PostgreSQL, never by downloading issues and
counting them in the browser, and "overdue" is decided against the server clock
because a date sent by a browser can be wrong or forged. Finally, loading, empty
and error states are shared components, so no screen is ever blank, an empty
state always names the next useful action, and a 403 explains the missing
permission instead of showing an error nobody can act on.
