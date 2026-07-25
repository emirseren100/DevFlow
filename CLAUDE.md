# CLAUDE.md — DevFlow Project Rules

Permanent working rules for this repository. Keep this file short.

## Communication

- Communicate with the user in Turkish.
- Code, file names, identifiers, comments and commit messages in English.
- Do not write long progress reports. Short summaries only.
- Ask a question only when a blocking ambiguity exists.

## Scope Discipline

- Before each task, read only the files relevant to that task.
- Do not scan the whole repository without a reason.
- Never read `node_modules`, `dist`, `coverage`, or generated files.
- Do not rewrite existing working structure without a reason.
- State the reason before any large refactor.
- Do not add unnecessary dependencies or abstractions.
- Do not add features that were not requested.

## Technology Stack (canonical, do not change)

- Frontend: React, TypeScript, Vite, React Router
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma
- Validation: Zod
- Auth: HTTP-only cookie session
- Testing: Vitest, React Testing Library, Supertest
- Infrastructure: Docker Compose, GitHub Actions, npm

Do not replace these or introduce alternative technologies.

## Code Quality

- Keep TypeScript strict mode safety.
- Do not hide errors with `any`, `@ts-ignore`, or disabling lint rules.
- Never skip authentication or authorization checks.
- Validate all external input with Zod at the API boundary.
- Keep important parts of the code simple enough for an intern to explain.

## Git

- Do not commit, push, or deploy without the user's explicit permission.

## Testing

- During development, run targeted tests only.
- Run the full test suite and build only at the end of a phase.

## End of Phase Checklist

- Update `docs/PROJECT_STATE.md`.
- Add a short entry to `docs/LEARNING_LOG.md`.
- Add a row to `docs/DECISIONS.md` if a technical decision was made.

## Documentation Map

- `docs/ARCHITECTURE.md` — system design
- `docs/ROADMAP.md` — 10 phases with acceptance criteria
- `docs/PROJECT_STATE.md` — handover source for new conversations
- `docs/DECISIONS.md` — technical decision table
- `docs/LEARNING_LOG.md` — phase-based learning notes
