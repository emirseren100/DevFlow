# DevFlow — Technical Decisions

Initial decisions taken in Phase 0. One row per decision.
New decisions are appended with the phase in which they were taken.

| # | Decision | Why | Rejected alternatives |
|---|---|---|---|
| 1 | React + TypeScript for the frontend | Largest ecosystem and the most common stack in job postings; TypeScript catches shape errors at compile time and makes API contracts explicit | Vue/Angular/Svelte (smaller hiring surface for this portfolio), plain JavaScript (no compile-time safety) |
| 2 | Vite as the frontend build tool | Fast dev server, native ESM, first-class TypeScript, near-zero configuration | Create React App (unmaintained), Webpack by hand (config burden), Next.js (adds SSR and a framework backend this project does not need) |
| 3 | React Router for client routing | Standard library for SPA routing; nested routes match the workspace → project → issue hierarchy | TanStack Router (less common), hand-rolled routing (reinventing a solved problem) |
| 4 | Express for the backend | Minimal, well-documented, understandable end-to-end; middleware model is easy to explain in an interview | NestJS (decorator/DI weight for a small app), Fastify (fine, but smaller learning material), serverless functions (harder local story) |
| 5 | PostgreSQL as the database | Relational data with real foreign keys — users, workspaces, projects, issues, comments are inherently relational; strong constraints and indexing | MongoDB (relations by hand, weaker integrity guarantees), SQLite (not representative of production hosting) |
| 6 | Prisma as the ORM | Type-safe generated client, readable schema file, versioned migrations committed to git | Raw SQL (no type safety, manual migrations), TypeORM/Sequelize (heavier, weaker TypeScript inference), Drizzle (good, but Prisma has more learning material) |
| 7 | Zod for validation | One schema produces both runtime validation and the static TypeScript type via `z.infer`; no duplicated definitions | Joi/Yup (no type inference), manual `if` checks (error-prone, inconsistent messages), `class-validator` (needs decorators and DI) |
| 8 | HTTP-only cookie session authentication | Cookie is unreadable by page JavaScript, which removes the XSS token-theft risk of `localStorage`; the browser attaches it automatically | JWT in `localStorage` (XSS-exposed), JWT in an `Authorization` header (same storage problem), third-party auth provider (hides the mechanism this project exists to learn) |
| 9 | `client/` and `server/` folder split in one repository | One repo to clone, run and review; clear boundary between browser code and server code without monorepo tooling | Two separate repositories (painful to run together), single mixed folder (no boundary), Nx/Turborepo monorepo (tooling overhead for two packages) |
| 10 | REST API | Predictable resource URLs, plain HTTP verbs and status codes, trivial to test with Supertest and inspect in the browser network tab | GraphQL (schema/resolver/caching overhead for a small fixed client), tRPC (couples client and server, less transferable as an API skill) |
| 11 | Docker Compose for local infrastructure | One command brings up PostgreSQL with a persistent volume; no host database install, identical setup for any reviewer | Locally installed PostgreSQL (setup friction per machine), hosted cloud database in development (cost, network dependency), Kubernetes (absurd for this scale) |
| 12 | npm as the package manager | Ships with Node.js, zero setup for a reviewer cloning the repo | pnpm/yarn/bun (faster, but an extra install step for anyone evaluating the project) |
| 13 | Vitest + React Testing Library + Supertest for tests | Vitest shares the Vite config and runs both sides; RTL tests user-visible behaviour; Supertest exercises the real Express app | Jest (extra config for TypeScript/ESM), Cypress/Playwright as the primary layer (slow, added later if at all) |
| 14 | Monolith, not microservices | A single team-sized product with one database; splitting services would add network calls, deployment complexity and distributed failure modes for no gain | Microservices, event-driven architecture, hexagonal/clean-architecture layering |
