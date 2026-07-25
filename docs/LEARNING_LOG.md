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
