# DevFlow client — static production build served by nginx.
#
# Build context is the repository root:
#
#   docker build -f client/Dockerfile .
#
# Vite inlines every VITE_ variable at build time, so the API URL is a build
# argument, not a runtime environment variable. Nothing secret may be passed
# here: everything VITE_ ends up readable in the shipped JavaScript.
FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY client/tsconfig.json client/vite.config.ts client/index.html client/
COPY client/src client/src
RUN npm run build --workspace client

# ---------------------------------------------------------------------------
# Runtime: a static file server. No Node, no Vite dev server, no build tooling.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# React Router owns the paths, so every unknown one has to fall back to
# index.html instead of becoming a 404.
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
