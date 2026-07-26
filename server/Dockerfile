# DevFlow API — production-oriented image.
#
# Build context is the repository root, because the npm lockfile and the
# workspace definition live there:
#
#   docker build -f server/Dockerfile .
#
# Debian slim rather than Alpine: @node-rs/argon2 is a native module and ships
# ready-made glibc binaries, so nothing has to be compiled inside the image.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# ---------------------------------------------------------------------------
# Dependencies. Copied first and on their own, so this layer is reused for
# every build that only changed source code.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
# `npm ci` installs exactly what the lockfile says — a build is reproducible
# and can never pick up a newer version by surprise.
RUN npm ci

# ---------------------------------------------------------------------------
# Build: generate the Prisma Client, then compile TypeScript to JavaScript.
# ---------------------------------------------------------------------------
FROM deps AS build
COPY server/tsconfig.json server/tsconfig.build.json server/prisma.config.ts server/
COPY server/prisma server/prisma
COPY server/src server/src
RUN npm run db:generate --workspace server \
    && npm run build --workspace server

# ---------------------------------------------------------------------------
# Runtime: production dependencies and compiled JavaScript only. No TypeScript
# compiler, no test tooling, no source.
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev && npm cache clean --force

# The compiled server, including the generated Prisma Client under dist/.
COPY --from=build /app/server/dist server/dist
# The schema and the migration history: `prisma migrate deploy` reads both at
# container start. The Prisma CLI is a normal dependency for exactly this.
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/server/prisma.config.ts server/prisma.config.ts

# `node` is an unprivileged user that already exists in the official image.
USER node

EXPOSE 4000

# The public health endpoint is the honest readiness signal, and Node can call
# it without adding curl to the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/server
# Compiled JavaScript, never tsx. Migrations are applied by the Compose command
# before this runs; the seed is never executed automatically.
CMD ["node", "dist/server.js"]
