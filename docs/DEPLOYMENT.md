# DevFlow — Deployment Guide

Manual steps to publish DevFlow as **one** Render Web Service backed by **one**
Render PostgreSQL database. Nothing here is automated: every step is something a
person does once, on purpose.

**No credential belongs in this file, in the repository, or in a screenshot.**
Render generates the database password and injects it as `DATABASE_URL`.

---

## 0. Before you start

| Requirement | Why |
|---|---|
| A GitHub account | Render deploys from a repository |
| A Render account | The host |
| Docker (optional) | To rehearse the production image locally first |

The repository is already prepared: `Dockerfile.production`, `render.yaml`, the
production start script and the same-origin client build all exist and are
verified locally.

**Review the plans first.** `render.yaml` currently selects `plan: free` for
both the web service and the database. Free web services sleep after a period of
inactivity (the first request afterwards is slow), and a free PostgreSQL
database is time-limited. Check Render's current pricing and availability, then
edit the two `plan:` lines — and the `region:` lines — before you deploy.

---

## 1. Create the GitHub repository

1. On GitHub: **New repository** → name it `devflow` → **Public** (a portfolio
   project should be readable) → **do not** add a README, .gitignore or licence,
   because this repository already has its own history.
2. Copy the empty repository's HTTPS URL.

Local checks before pushing anything:

```bash
git status
```

```bash
git log --oneline
```

Confirm no `.env` file and no `dist/` directory is tracked:

```bash
git ls-files | grep -E "(^|/)(\.env$|\.env\.|dist/|coverage/)"
```

That command should print **nothing** except the `.env.example` files.

---

## 2. Push the existing history

```bash
git remote add origin https://github.com/<your-account>/devflow.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

The commit history is the portfolio artefact — push it as it is. Do not squash
it into one "initial commit".

After the push, open the repository's **Actions** tab: the CI workflow
(`.github/workflows/ci.yml`) runs `npm ci`, validates the schema, applies the
migrations to a throwaway PostgreSQL service, then typechecks, tests and builds.
Wait for the green check before deploying anything.

---

## 3. Connect the repository to Render

1. Sign in to Render and authorise it to read your GitHub account. Grant access
   to the `devflow` repository only — Render does not need your other work.
2. **New** → **Blueprint**.
3. Select the `devflow` repository. Render reads `render.yaml` from the
   repository root.

---

## 4. Create (or sync) the Blueprint

Render shows what it is about to create:

| Resource | Name | What it is |
|---|---|---|
| Web service | `devflow` | Docker, built from `Dockerfile.production` |
| PostgreSQL | `devflow-db` | The managed database |

Check before applying:

- the health check path is `/api/health`
- the Dockerfile path is `./Dockerfile.production` and the context is the root
- the branch is `main` and auto-deploy is on
- both plans and both regions are what you decided in step 0

Then **Apply**. Render creates the database first, because the web service reads
its connection string.

Later changes to `render.yaml` are picked up with **Manual sync** on the
Blueprint page.

---

## 5. Review the database

On the `devflow-db` page:

- confirm the region matches the web service (a cross-region query pays for the
  distance on every request)
- note the expiry date if you chose a free database
- **do not** copy the connection string anywhere. The web service already reads
  it through `fromDatabase` in the Blueprint

---

## 6. Environment variables

`render.yaml` already sets, on the web service:

| Variable | Value | Source |
|---|---|---|
| `NODE_ENV` | `production` | Blueprint |
| `DATABASE_URL` | the managed database's connection string | Blueprint → database |
| `DATABASE_POOL_MAX` | `10` | Blueprint |
| `SESSION_COOKIE_NAME` | `devflow_session` | Blueprint |
| `SESSION_TTL_DAYS` | `7` | Blueprint |
| `PORT` | assigned | Render |
| `RENDER_EXTERNAL_URL` | the service address | Render |

Add one variable **by hand in the dashboard only if** you attach a custom
domain:

| Variable | Value |
|---|---|
| `CLIENT_ORIGIN` | `https://your-custom-domain.example` (no path, no trailing slash) |

Without it the server trusts `RENDER_EXTERNAL_URL`, which is correct for the
default `*.onrender.com` address. With a custom domain, `CLIENT_ORIGIN` must be
the address the browser actually shows, or every mutation is refused with
`403 INVALID_ORIGIN`.

---

## 7. First deployment

The Blueprint apply already triggers a build. Watch the **Logs** tab.

A healthy first deployment prints, in order:

1. the Docker build stages (dependencies, Prisma Client, client build, server
   build, runtime image)
2. `3 migrations found in prisma/migrations`
3. `The following migration(s) have been applied:` and the three migration names
4. `All migrations have been successfully applied.`
5. `DevFlow API listening on http://localhost:<PORT>`
6. `Allowed client origin: https://<your-service>.onrender.com`

Then Render polls `/api/health` and marks the service **Live**.

---

## 8. Check the migration log

The migrations run **inside** the container, before the server starts. Confirm
in the logs that step 3 above lists:

```
20260726000000_init_devflow_schema
20260726010000_add_authentication_models
20260726020000_add_project_issue_numbering
```

If the log stops at an error instead, the container exits and Render keeps the
previous version running (or, on a first deploy, reports a failed deploy). It
never starts the server against a half-migrated database — that is what the
`&&` in `start:production` guarantees.

---

## 9. Check the health endpoint

```bash
curl -i https://<your-service>.onrender.com/api/health
```

Expected: `200` and `{"success":true,"data":{"status":"ok"}}`.

Two more checks worth one minute each:

```bash
curl -i https://<your-service>.onrender.com/api/does-not-exist
```

Expected: `404` **JSON**, not an HTML page.

Open `https://<your-service>.onrender.com/app/workspaces` in a browser and press
reload. Expected: the application loads (or redirects to `/login`) instead of a
404 — that is the SPA fallback working.

---

## 10. Register the first account

The production database starts **empty**. The development seed is never run
there, because its accounts share one publicly documented password.

1. Open `https://<your-service>.onrender.com/register`.
2. Create your own account with a password you do not use anywhere else.
3. Sign in. Confirm in the browser devtools that the session cookie is
   `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and that it is **not**
   readable from the JavaScript console.

---

## 11. Create demonstration data

Through the application UI only — this also proves every path works end to end:

1. Create a workspace, e.g. **Acme Product**.
2. Register a second and a third account (they can be your own aliases), then
   add them as `ADMIN` and `MEMBER`.
3. Create two projects with real keys, e.g. `API` and `WEB`.
4. Add a sprint to one of them.
5. File six to ten issues: both types, several priorities, some assigned, some
   with due dates, one overdue.
6. Move a few cards on the Kanban board so the activity feed has real rows.
7. Write two or three comments.
8. Open the dashboard: the numbers should now describe a workspace that looks
   used rather than empty.

Take the README screenshots from this state.

If you publish a shared demo account, give it the `MEMBER` role and put nothing
in it you would mind a stranger deleting.

---

## 12. Update the README

Replace the two placeholders in `README.md`:

- **Live demo** — the real URL, and whether a demo account exists
- **Screenshots** — the images from step 11

Commit and push. Auto-deploy rebuilds; documentation-only changes are harmless.

---

## 13. When a deployment fails

| Symptom in the logs | Likely cause | Fix |
|---|---|---|
| `Invalid server environment: - CLIENT_ORIGIN: …` | Production could not resolve a trusted origin | Set `CLIENT_ORIGIN` in the dashboard (only needed with a custom domain) |
| `- DATABASE_URL: DATABASE_URL is required.` | The Blueprint link to `devflow-db` is missing | Re-sync the Blueprint; check `fromDatabase` in `render.yaml` |
| `P1001: Can't reach database server` | Database still starting, wrong region, or IP restrictions | Wait for the database to be available, then redeploy |
| `P3009` (a failed migration is recorded) | A migration failed part-way in an earlier deploy | Inspect the database, fix the migration, deploy again. Never "fix" it by resetting production |
| Health check keeps failing | The server crashed after start, or listens on the wrong port | Check the logs; the server must use `process.env.PORT`, which it does by default |
| `403 INVALID_ORIGIN` on every login | The browser's address is not the trusted origin | Set `CLIENT_ORIGIN` to exactly what the address bar shows |
| The client loads but every request 404s | The bundle was built with the wrong API base | It must be `/api`; check the `VITE_API_URL` build argument |

The application's own failures never leak internals: an unexpected error is
`500 INTERNAL_ERROR` with one sentence, and the detail stays in the Render log.

---

## 14. Rolling back safely

**Code.** On the service's **Deploys** tab, pick the last known-good deployment
and choose **Rollback**. Render redeploys that image.

**Data.** A rollback of the code does **not** undo a migration. Prisma
migrations here are additive (new columns and indexes), so an older application
version keeps working against the newer schema. If a future migration ever drops
or renames something, write a forward migration that restores it instead of
reversing history in production.

**Never** run `prisma migrate reset`, `prisma db push` or the seed against the
production database. None of them is part of any npm script in this repository
for exactly that reason.

---

## 15. Local production rehearsal (optional but recommended)

Verify the deployment image on your own machine before trusting it to a
platform. Use a **throwaway** database, never your development one:

```bash
docker build -f Dockerfile.production -t devflow:production .
```

```bash
docker network create devflow_verify
```

```bash
docker run -d --name devflow-verify-db --network devflow_verify -e POSTGRES_DB=devflow_verify -e POSTGRES_USER=verify -e POSTGRES_PASSWORD=verify_throwaway_pw postgres:17-alpine
```

```bash
docker run -d --name devflow-verify-app --network devflow_verify -p 10000:10000 -e NODE_ENV=production -e PORT=10000 -e RENDER_EXTERNAL_URL=http://localhost:10000 -e DATABASE_URL=postgresql://verify:verify_throwaway_pw@devflow-verify-db:5432/devflow_verify?schema=public devflow:production
```

Then check the four things that matter:

```bash
curl -i http://localhost:10000/api/health
```

```bash
curl -i http://localhost:10000/api/does-not-exist
```

```bash
curl -i http://localhost:10000/app/workspaces/x/projects/y/board
```

```bash
curl -sI http://localhost:10000/ | grep -i content-security-policy
```

Clean up completely — the containers and the network are disposable:

```bash
docker rm -f devflow-verify-app devflow-verify-db
```

```bash
docker network rm devflow_verify
```

> Note: logging in over `http://localhost` will not work in this rehearsal, and
> that is correct — the production cookie is `Secure`, so the browser only
> stores it over HTTPS. The rehearsal proves the container, the migrations, the
> static client, the SPA fallback and the API contract.
