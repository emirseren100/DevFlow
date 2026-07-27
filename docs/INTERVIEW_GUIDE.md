# DevFlow — Technical Interview Guide

Every topic follows the same four beats:

- **Simple** — how you would explain it to someone outside software
- **Technical** — the precise version
- **Where** — the files to open if they ask
- **Q / A** — the question you will actually be asked, and a short answer

Answer in your own words. If you do not know something, say so and say what you
would check — that answer scores better than a confident wrong one.

---

## 1. Overall architecture

**Simple.** One website and one server. The browser draws the screens; the
server owns the data and decides who may do what.

**Technical.** A monolith in one repository, split into two npm workspaces. The
React client is a single-page application that only talks to a REST API. The
Express server is the only thing that touches PostgreSQL, validates every input
with Zod, checks authentication and authorization on every request, and answers
one response shape: `{ success: true, data }` or `{ success: false, error }`.
In production both are served by the **same** process on the **same** origin.

**Where.** `docs/ARCHITECTURE.md`, `server/src/app.ts`, `client/src/App.tsx`.

**Q — Why a monolith instead of microservices?**
One product, one team, one database. Microservices would add network calls,
separate deployments and distributed failures to solve a scaling problem I do
not have. The code is already split by module, so if one part ever needed to
scale separately, the boundary exists.

---

## 2. npm workspaces

**Simple.** One folder holds two projects, and one `npm install` sets up both.

**Technical.** The root `package.json` declares `workspaces: ["client",
"server"]`. Dependencies are hoisted into one `node_modules` and one
`package-lock.json`, so CI and Docker install exactly one dependency tree with
`npm ci`. Root scripts delegate with `--workspace`.

**Where.** `package.json` (root), `client/package.json`, `server/package.json`.

**Q — Why not two repositories, or a monorepo tool?**
Two repositories would mean cloning twice and keeping versions in step by hand.
Nx or Turborepo would be a build system to learn and explain for two packages.
Workspaces come with npm and cost nothing.

---

## 3. React and TypeScript

**Simple.** React builds the screen out of small reusable pieces. TypeScript
catches mistakes while I type instead of when a user clicks.

**Technical.** Function components and hooks only, no class components. Strict
TypeScript: no `any`, no `@ts-ignore`. API response types are declared once in
`client/src/lib/*Api.ts` and flow through the components, so renaming a server
field breaks the build rather than the page.

**Where.** `client/src/pages/`, `client/src/components/`, `client/src/lib/`.

**Q — What does TypeScript actually buy you here?**
The client and the server agree on a shape. When I changed the issue payload,
the compiler listed every screen that had to change. Without it I would have
found those by clicking.

---

## 4. TanStack Query

**Simple.** It remembers what the server already said, so screens do not
re-download the same thing, and it refreshes exactly what changed after an edit.

**Technical.** One `QueryClient` with deliberate defaults: `retry: false`, no
refetch on window focus, 30-second `staleTime`. Every key comes from one
factory (`queryKeys.ts`) — never written inline — so invalidation cannot miss
because of a typo. After a mutation only the affected keys are invalidated:
a Kanban move always refreshes the board, and only on a real status change also
the issue, the lists, the feeds and the dashboard.

**Where.** `client/src/lib/queryClient.ts`, `client/src/lib/queryKeys.ts`, any
page's `useMutation`.

**Q — Why not Redux?**
Redux manages *client* state. Almost all state here is *server* state: data that
lives in PostgreSQL and can go stale. Query handles caching, loading, errors and
invalidation for that case. The little real client state I have — who is signed
in — lives in a small React context.

**Q — Why disable retries?**
`401`, `403` and `404` are correct answers, not flakes. Retrying them delays the
error screen and hides the reason. Every error state has a visible "Try again".

---

## 5. Express

**Simple.** Express is the traffic controller: a request goes through a queue of
small functions, and each one may handle it or pass it on.

**Technical.** `createApp()` builds the app without listening, so Supertest can
use it. The middleware order is deliberate: security headers → CORS → JSON body
limit → cookies → origin check → auth rate limit → routers → API 404 → (in
production) static client and SPA fallback → 404 → error handler. The error
handler takes four arguments, which is how Express recognises it, and it is the
only place that formats a failure.

**Where.** `server/src/app.ts`, `server/src/middleware/`.

**Q — Why does middleware order matter?**
CORS must answer the preflight before anything can refuse the request; the body
must be parsed before a route reads it; and the 404 must come after all routes
but before the error handler. Move one and something silently breaks.

---

## 6. REST APIs

**Simple.** Every thing has an address, and the verb says what to do with it.

**Technical.** Resources are nested the way the data is:
`/api/workspaces/:workspaceId/projects/:projectId/issues/:issueId`. `GET` reads,
`POST` creates, `PATCH` edits, `DELETE` removes. Status codes carry meaning:
`400` validation, `401` not signed in, `403` not allowed, `404` not found, `409`
conflict, `413` too large, `429` too many, `500` unexpected. Every failure also
carries a machine-readable `code` such as `ISSUE_NOT_FOUND`.

**Where.** `server/src/modules/*/**.routes.ts`, `server/src/lib/apiError.ts`.

**Q — Why nested URLs?**
Because they carry the authorization check. The workspace id in the path is what
every lookup filters by, so a project id from another workspace returns `404`
instead of someone else's data.

---

## 7. PostgreSQL relations

**Simple.** Data lives in tables that point at each other, and the database
itself refuses to break those links.

**Technical.** User ↔ Workspace is many-to-many through an explicit
`WorkspaceMember` join model that carries `role` and `joinedAt`. Workspace →
Project → Issue are one-to-many. `Issue.assigneeId` and `Issue.sprintId` are
optional. Enums (`WorkspaceRole`, `IssueStatus`, `IssueType`, `Priority`) are
real PostgreSQL enums. `(projectId, number)` is a composite unique index.

**Where.** `server/prisma/schema.prisma`.

**Q — Why an explicit join table instead of an implicit many-to-many?**
Because membership carries data. A role belongs to the *pair* of user and
workspace — the same person can be OWNER in one and MEMBER in another. An
implicit table has no room for that column.

---

## 8. Prisma

**Simple.** I describe the tables in one readable file, and Prisma gives me
typed functions to query them.

**Technical.** Prisma 7 with the `@prisma/adapter-pg` driver adapter over the
standard `pg` driver. `prisma.config.ts` holds the schema path, the migrations
path and the seed command. The generated client is typed from the schema, so a
`select` that names a non-existent column does not compile.

**Where.** `server/prisma/schema.prisma`, `server/prisma.config.ts`,
`server/src/lib/prisma.ts`.

**Q — What are Prisma's downsides?**
Complex SQL is harder to express than in raw SQL, and the generated client is
another build step to keep in sync. For this data shape the type safety is worth
it; for a reporting-heavy query I would drop to `$queryRaw`.

---

## 9. Migrations

**Simple.** Every database change is a small numbered file, so any copy of the
database can be brought up to date the same way.

**Technical.** Three committed migrations. `prisma migrate dev` authors one on a
laptop; **containers and CI only ever run `prisma migrate deploy`**, which
replays committed migrations and can neither author nor reset. The
issue-numbering migration also backfilled existing rows and moved each project's
counter past its highest number, so no development data was lost.

**Where.** `server/prisma/migrations/`, `Dockerfile.production`,
`.github/workflows/ci.yml`.

**Q — What happens if a production migration fails?**
The start command is `prisma migrate deploy && node dist/server.js`. The `&&`
means the server never starts, the container exits, and the platform keeps the
previous version running. A half-migrated database is never served.

---

## 10. Authentication

**Simple.** You give an email and a password once; after that the browser proves
who you are automatically.

**Technical.** Email plus password. On success the server creates a `Session`
row and sends the raw token in an HTTP-only cookie. `requireAuth` reads the
cookie on every request, hashes the token, looks the row up, checks expiry and
attaches the user. Logout deletes the row, so the session is dead immediately.

**Where.** `server/src/modules/auth/auth.service.ts`,
`server/src/modules/auth/auth.middleware.ts` (`requireAuth`).

**Q — Why database sessions instead of JWT?**
Revocation. A JWT stays valid until it expires, so "sign out everywhere" needs a
denylist — which is a session table with extra steps. A session row is one
indexed lookup and I already have PostgreSQL.

---

## 11. Authorization

**Simple.** Being signed in is not the same as being allowed.

**Technical.** Three roles per workspace: `OWNER`, `ADMIN`, `MEMBER`. The role
is read from the database on every request, never from the client. Middleware
chains resolve the membership, then the project filtered by that workspace, then
the issue filtered by that project. Some rules are relational rather than
role-based: a MEMBER may edit or move an issue they reported or are assigned to.

**Where.** `server/src/modules/workspaces/workspace.authorization.ts`,
`server/src/modules/projects/project.authorization.ts`,
`server/src/modules/issues/issue.authorization.ts`.

**Q — The UI hides the delete button. Is that security?**
No. Hiding it is politeness — a button that always fails is bad UX. The server
re-checks every request, so `curl` gets the same `403` the button would have.

---

## 12. HTTP-only cookies

**Simple.** The browser holds the key, and the page's own JavaScript cannot read
it.

**Technical.** `httpOnly: true` (invisible to `document.cookie`, so an XSS bug
cannot steal it), `secure: true` in production (HTTPS only), `sameSite: 'lax'`
(not sent on cross-site POSTs), `path: '/'`, no `Domain`, and a `maxAge` equal to
the session TTL.

**Where.** `server/src/modules/auth/auth.service.ts`.

**Q — Why not `localStorage`?**
Anything in `localStorage` is readable by any script on the page. One injected
script and the token is gone. An HTTP-only cookie removes that whole class of
attack, and the client never handles a secret at all.

---

## 13. Password hashing

**Simple.** Passwords are never stored. What is stored cannot be turned back
into the password.

**Technical.** Argon2id via `@node-rs/argon2` — the OWASP default, deliberately
slow and memory-hard, so guessing is expensive even with a GPU. Each hash
carries its own salt and parameters.

**Where.** `server/src/modules/auth/auth.service.ts` (`@node-rs/argon2`).

**Q — Why not SHA-256 for passwords?**
Because it is fast, and speed is the attacker's friend. Billions of SHA-256
guesses per second is normal hardware. Argon2id is tuned to make each guess cost
real time and memory.

---

## 14. Session-token hashing

**Simple.** Even the login tokens are stored scrambled.

**Technical.** The token is 32 cryptographically random bytes, so there is
nothing to guess and no dictionary to try; only its SHA-256 hash is stored. A
leaked database dump therefore contains no usable session.

**Where.** `server/src/modules/auth/auth.service.ts`.

**Q — Why Argon2 for passwords but SHA-256 for tokens?**
A password is low-entropy and human-chosen, so hashing must be slow. A token is
already 256 bits of randomness, so a slow hash would add latency to *every
request* and buy nothing.

---

## 15. Transactions

**Simple.** Several database changes that must all happen, or none of them.

**Technical.** Two places need it. Creating an issue increments
`project.nextIssueNumber` and inserts the row in one transaction, so the row
lock serialises concurrent creates. A Kanban move reads the destination column,
inserts, renumbers both affected columns and writes the activity row inside one
`Serializable` transaction, retried up to three times on Prisma's `P2034`
write-conflict error.

**Where.** `server/src/modules/issues/issue.service.ts`,
`server/src/modules/kanban/kanban.service.ts`.

**Q — Why `Serializable` and not the default level?**
Two people reordering the same column can interleave their reads and writes and
produce duplicate positions. `Serializable` makes that impossible; the price is
an occasional conflict error, which is exactly what the bounded retry handles.

---

## 16. Issue numbering

**Simple.** Each project counts its own issues, so you get `API-1` and `WEB-1`
instead of `#4297`.

**Technical.** Each project owns `nextIssueNumber`. Creating an issue increments
it inside the creating transaction and uses the value it passed. A composite
unique index on `(projectId, number)` is the final guarantee. The display key
`API-14` is derived from the project key and the number — never stored twice.

**Where.** `server/src/modules/issues/issue.service.ts`, the
`20260726020000_add_project_issue_numbering` migration.

**Q — Why not `count() + 1`?**
That is a race. Two requests can count the same total and both write number 7.
The counter lives in the row, the increment locks it, and the unique index
catches anything that still slips through.

---

## 17. Kanban ordering

**Simple.** Each column numbers its cards 0, 1, 2. Moving a card renumbers the
columns it affected.

**Technical.** `Issue.position` is a column-local integer. The client sends only
`issueId`, `targetStatus` and `targetIndex`; the server reads the real order,
clamps the index to the column length, inserts, renumbers, and returns the
confirmed board — which is what the client then renders. A negative index is a
`400`. A same-column reorder writes no activity.

**Where.** `server/src/modules/kanban/kanban.service.ts`,
`client/src/pages/BoardPage.tsx`.

**Q — Why renumber instead of fractional positions?**
Fractional positions (`1000`, `1500`, `1750`) avoid writes but drift toward
floating-point precision and need periodic compaction. Renumbering one column is
a handful of rows, and "the third card in To Do" is something I can read
straight out of the database.

**Q — Why does the server decide the order?**
Because a client is not trustworthy. If I accepted the client's full list of
ids, a hand-made request could reorder anyone's board.

---

## 18. Comments and activity logs

**Simple.** Comments are what people write. The activity feed is what the system
recorded.

**Technical.** Two models on purpose: a comment is editable by its author; an
activity row is append-only and nobody may edit it. Activity stores a type plus
small whitelisted metadata (`previousStatus`, `nextStatus`, `changedFields`, …)
— never a formatted sentence. The client turns that into "Ada moved API-2 from
To Do to In Progress", so wording and translation change without a migration.
Metadata is filtered against a key whitelist on the way out, so a careless
future writer cannot leak an object through the feed.

**Where.** `server/src/modules/comments/`, `server/src/modules/activities/`,
`client/src/lib/activityText.ts`.

**Q — Why not one "timeline" table?**
It would need one model with two permission sets and a nullable body. Two small
models are easier to reason about than one model with an identity crisis.

---

## 19. Testing

**Simple.** Around 300 automated checks that run before I trust a change.

**Technical.** Vitest on both sides. The client uses React Testing Library and
asserts what a user sees — roles, labels, text — never implementation details.
The server uses Supertest against the real Express app and a **real** PostgreSQL
test database, because the point is to prove unique constraints, cascades,
transactions and role checks actually behave. The test setup refuses any
`DATABASE_URL` that does not contain `devflow_test`, so a mistyped URL cannot
touch development data.

**Where.** `client/src/test/`, `server/src/test/`.

**Q — Why not mock the database?**
Then I would be testing the mock. The bugs I care about — a race on issue
numbers, a cascade deleting too much, a role check reading a stale value — only
exist in a real database.

**Q — What is your coverage?**
Around 93% of client lines and 95% of server lines, and there is deliberately no
threshold. Coverage says which lines ran, not whether the behaviour is right.

---

## 20. Docker

**Simple.** A recipe that builds the exact same running application on any
machine.

**Technical.** Two setups. Docker Compose is the development stack: PostgreSQL,
the API, and the client behind nginx, on host ports 5175 / 4000 / 5433 so it can
run beside a local `npm run dev`. `Dockerfile.production` is the deployment
image: a multi-stage build that installs with `npm ci`, generates the Prisma
Client, builds both sides, then copies only the compiled output, the built
client, the schema and the migrations into a runtime image with production
dependencies, running as the unprivileged `node` user.

**Where.** `docker-compose.yml`, `Dockerfile.production`, `server/Dockerfile`,
`client/Dockerfile`.

**Q — Why multi-stage?**
The build needs TypeScript, the Prisma CLI and every devDependency. The running
server needs none of them. Splitting the stages ships a smaller image with a much
smaller attack surface.

---

## 21. Continuous integration

**Simple.** GitHub runs my checks on every push, so a broken change is visible
before anyone downloads it.

**Technical.** One job: `npm ci` → `db:validate` → `db:generate` → `db:deploy` →
`typecheck` → `test` → `build`, against a disposable PostgreSQL service
container named `devflow_test`. Nothing is `continue-on-error`, and the workflow
does not deploy.

**Where.** `.github/workflows/ci.yml`.

**Q — Why apply migrations in CI?**
Because it proves the committed migrations actually apply to an empty database.
`db push` would skip that check entirely.

---

## 22. Production deployment

**Simple.** One service on the internet serves both the website and its API, and
a managed database stores the data.

**Technical.** One Render Web Service built from `Dockerfile.production`, plus
one Render PostgreSQL, described in `render.yaml`. Express answers `/api/*` and
serves `client/dist` for every other address, so a refresh on a React Router
route returns `index.html` while an unknown `/api` address stays JSON. The client
bundle is built with `VITE_API_URL=/api`, so it always calls its own origin. The
server listens on `process.env.PORT` and trusts `CLIENT_ORIGIN`, else
`RENDER_EXTERNAL_URL`, else nothing — production refuses to start without one.
`/api/health` is the health check.

**Where.** `render.yaml`, `Dockerfile.production`,
`server/src/middleware/serveClient.ts`, `docs/DEPLOYMENT.md`.

**Q — Why one origin instead of a frontend host plus an API host?**
The cookie. On one origin it is first-party and `SameSite=Lax` keeps its
meaning. Split across two hosts, every authenticated request becomes cross-site,
which forces `SameSite=None` and depends on third-party cookie behaviour that
browsers keep tightening. One origin removes the problem instead of managing it.

**Q — How does the SPA fallback avoid swallowing the API?**
Order. The API routes and the API's own JSON 404 are mounted before the client
router, so nothing starting with `/api` ever reaches the fallback.

---

## 23. Major trade-offs

| Chosen | Instead of | Why |
|---|---|---|
| Monolith, one origin | Split services and hosts | One product, one team; cookies stay first-party |
| Database sessions | JWT | Instant revocation |
| Origin check on mutations | CSRF token flow | ~15 readable lines, no token store, enough at this scale |
| Server-owned Kanban order | Trusting the client's list | A client cannot be trusted with other people's cards |
| Hand-written CSS tokens | A UI framework | One theme, five kinds of block, no framework opinions to fight |
| Real test database | Mocked Prisma | The bugs worth catching only exist in a real database |
| No realtime | WebSockets | A second protocol, connection state and per-message auth for a feature the MVP does not need |

**Q — What would you do differently next time?**
Introduce TanStack Query earlier. I wrote `useEffect` fetching in Phases 4 and 5
and replaced it in Phase 7; the duplication was predictable by then.

---

## 24. Known limitations

Say these before you are asked — knowing your own gaps reads as engineering
judgement.

- No realtime updates: another person's change appears after a refetch or reload
- No email anywhere: no verification, no password reset, no invitations
- No MFA and no session-management screen
- The login rate limiter is in-memory and per process, so several instances
  would need a shared store
- The origin check is not a full CSRF-token flow
- Deletion is permanent: no soft delete, no undo
- Comments are plain text with no pagination
- One dark theme, verified in one browser engine at four widths
- No lint tooling and no visual regression tests
- Coverage has no threshold on purpose

**Q — Which of these would you fix first?**
Password reset, because a user who forgets their password today is stuck.
Realtime would be more fun, but it solves a smaller problem.

---

## 25. Questions about how the project was built

Be straightforward: this is a learning project built with AI assistance, and the
value on offer is that you understand and can defend every decision in it.

**Q — Did you use AI to build this?**
Yes, as a pair — for scaffolding, for review and for the parts I had not done
before. Every architectural decision is written down with its alternatives in
`docs/DECISIONS.md`, and I can walk through any file and explain why it is the
way it is. That was the point of the project: not to produce code I cannot read.

**Q — Show me something you debugged yourself.**
The production container refused to start with Prisma `P1013`: an empty
`shadowDatabaseUrl` in `prisma.config.ts` is not the same as no shadow database
URL, and `migrate deploy` rejects it. It never appeared locally because the
local commands supplied the variable. The fix was to omit the key entirely when
the variable is unset — found by actually running the deployment image against a
throwaway database before trusting it to a platform.
