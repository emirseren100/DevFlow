# DevFlow — Final QA Checklist

Manual checks before calling the project finished. **Tick a box only after you
have actually done the check yourself.** An unticked box is honest; a wrongly
ticked one is worse than no checklist.

Legend: `[x]` verified · `[ ]` not verified yet · dates in the notes column.

---

## 1. Repository cleanliness

- [x] `git status` is clean or contains only intended changes
- [x] No `.env`, `.env.test` or `.env.docker` file is tracked
- [x] No `dist/`, `coverage/` or `node_modules/` is tracked
- [x] `package-lock.json` is tracked
- [x] `.env.example`, `.env.test.example` and `.env.docker.example` are tracked
- [x] A tracked-file scan for keys, tokens and connection strings finds nothing
- [x] `.gitignore` covers env files, build output, coverage, logs, database
      dumps, local Docker volumes, IDE files and OS metadata
- [ ] The repository is public and the description is set

## 2. Git history

- [x] Commits are in English and describe real changes
- [ ] History is pushed to GitHub without being squashed
- [ ] No commit contains a password, token or connection string
- [ ] `main` is the default branch

## 3. GitHub Actions

- [ ] The CI workflow runs on the first push
- [ ] `npm ci`, `db:validate`, `db:generate`, `db:deploy`, `typecheck`, `test`
      and `build` all pass on the runner
- [ ] The run is green, with no step marked `continue-on-error`

## 4. Local verification (before deploying)

- [x] `npm run typecheck` passes
- [x] `npm test` passes
- [x] `npm run test:coverage` passes
- [x] `npm run build` passes
- [x] `docker compose config` validates
- [x] `docker build -f Dockerfile.production` succeeds
- [x] The production container starts against a throwaway database
- [x] Migrations are applied by the container before the server listens
- [x] `GET /api/health` returns `200` JSON from the container
- [x] `/` and a nested React Router address both return `index.html`
- [x] An unknown `/api/...` address returns JSON `404`, never HTML
- [x] A hashed asset under `/assets/` is served with a `200`
- [x] The session cookie is `HttpOnly; Secure; SameSite=Lax; Path=/` with no
      `Domain`
- [x] A mutation with a foreign `Origin` is refused with `403`
- [x] A mutation with no `Origin` is refused in production

## 5. Production deployment

- [ ] The Blueprint created exactly one web service and one database
- [ ] The chosen plans and regions were reviewed before applying
- [ ] The first deployment succeeded
- [ ] The migration log lists all three migrations as applied
- [ ] Render's health check passes and the service is **Live**
- [ ] `https://<service>/api/health` returns `200` from the public internet
- [ ] The client loads over HTTPS with no mixed-content warning
- [ ] A direct reload of a nested route returns the application, not a 404
- [ ] `DATABASE_URL` is set from the managed database, not typed by hand

## 6. Authentication

- [ ] Registering the first production account works
- [ ] Signing out and back in works
- [ ] The session cookie is not readable from `document.cookie`
- [ ] `localStorage` and `sessionStorage` stay empty
- [ ] An expired or deleted session forces a redirect to `/login`
- [ ] A protected API address without a cookie returns `401`
- [ ] Login with a wrong password gives the same message for a known and an
      unknown email
- [ ] Repeated failed logins eventually return `429`

## 7. Permissions — OWNER

- [ ] Sees Settings, the danger zone, member role selectors and removal
- [ ] Can rename and delete a workspace
- [ ] Can change a member between `ADMIN` and `MEMBER`
- [ ] Cannot demote, remove or duplicate the OWNER membership

## 8. Permissions — ADMIN

- [ ] Can rename the workspace and manage projects
- [ ] Can add and remove `MEMBER` accounts
- [ ] Sees no workspace danger zone
- [ ] Cannot change roles

## 9. Permissions — MEMBER

- [ ] Sees no Settings link and no project settings
- [ ] Can create issues and comments
- [ ] Can move only the cards they report or are assigned to
- [ ] A hand-made `curl` request for a forbidden action still returns `403`

## 10. Workspace flow

- [ ] Creating a workspace makes the creator its OWNER
- [ ] The workspace switcher lists only workspaces the user belongs to
- [ ] Adding a member by an unknown email returns a clear "user not found"
- [ ] The dashboard counts match what the workspace actually contains

## 11. Project and sprint flow

- [ ] Creating a project uppercases its key
- [ ] A duplicate key inside a workspace is refused
- [ ] Archiving a project moves it out of the active count
- [ ] Deleting a project asks for confirmation and removes its issues
- [ ] A sprint holding issues cannot be deleted

## 12. Issue flow

- [ ] The first issue of a project is number 1, and keys read `KEY-n`
- [ ] Filters and pagination survive a reload and a shared link
- [ ] Search finds an issue by title, by description and by number
- [ ] An assignee outside the workspace is refused
- [ ] Due dates and overdue counts use the server's clock

## 13. Kanban

- [ ] Cards appear in the five columns in position order
- [ ] Drag-and-drop moves a card and it stays there after a reload
- [ ] The accessible "Move … to" control does the same thing
- [ ] A refused move rolls the board back instead of leaving a duplicate
- [ ] Reordering inside one column writes no activity row

## 14. Comments

- [ ] A comment can be created, edited by its author and deleted
- [ ] An empty or whitespace-only comment is refused
- [ ] An OWNER or ADMIN can delete but not rewrite someone else's comment
- [ ] Line breaks in a comment survive; typed HTML stays visible text

## 15. Activity

- [ ] Issue creation, status changes and comments appear as readable sentences
- [ ] The project feed paginates with "Load more"
- [ ] The issue history shows only that issue's rows

## 16. Responsive layout

- [ ] 1440px — nothing stretched or empty
- [ ] 1024px — navigation and content still comfortable
- [ ] 768px — the layout reflows without a horizontal scrollbar
- [ ] 390px — the navigation collapses behind Menu, actions are tappable
- [ ] The Kanban board scrolls sideways instead of squeezing five columns
- [ ] A very long workspace or project name wraps instead of widening the page

## 17. Accessibility

- [ ] One `banner` and one `main` landmark per page, and one `h1`
- [ ] Every interactive control is reachable and usable with the keyboard
- [ ] The focus ring is visible on every focusable element
- [ ] The confirmation dialog takes focus, traps Tab and closes on Escape
- [ ] No status is signalled by colour alone
- [ ] Text contrast stays above 4.5:1

## 18. Browser console

- [ ] No errors on any route
- [ ] No React key or hydration warnings
- [ ] No failed network request on a normal walk-through
- [ ] No Content-Security-Policy violation reported in production

## 19. Production logs

- [ ] No stack trace reaches a client response
- [ ] No environment value or database URL is printed
- [ ] Unexpected errors appear in the platform log as `INTERNAL_ERROR`
- [ ] The log has no repeating error after the deployment settles

## 20. Database persistence

- [ ] Data created through the UI survives a redeploy
- [ ] A restart does not lose sessions (they live in PostgreSQL)
- [ ] The production database was never reset or seeded

## 21. Logout and session behaviour

- [ ] Signing out clears the cookie and the session row
- [ ] A back-button press after sign-out does not show protected data
- [ ] Two browsers can hold two independent sessions
- [ ] Signing out in one does not sign the other out

## 22. README and links

- [ ] The live demo link works
- [ ] Screenshots are present and current
- [ ] Every documentation link resolves
- [ ] Every command in the README actually exists in `package.json`
- [ ] No credential appears anywhere in the README
- [ ] The project status section matches reality
