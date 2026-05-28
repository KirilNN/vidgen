# services/api — production Dockerfile (T-015)
#
# Multi-stage build:
#   base:  node:22-alpine + pnpm (matches engines.node = >=22.11 <23).
#   deps:  workspace package.json files + lockfile → frozen install.
#          Splitting deps from src keeps the layer cache warm across
#          source edits — only changes to package.json bust this layer.
#   src:   copy the actual sources for the @vidgen/api workspace plus
#          the two workspace packages it imports (@vidgen/config,
#          @vidgen/openapi). We do NOT compile to JS — tsconfig.base.json
#          has noEmit:true and runtime uses `tsx`, which is moved to
#          `dependencies` in services/api/package.json for this reason.
#   final: minimal runtime image. tsx + Node 22 + the API src.
#
# Why pnpm v9: matches packageManager pin at the repo root.
# Why alpine: ~50 MB base vs ~360 MB on debian-slim; the only native module
# we ship today is `postgres` (postgres.js) which is pure JS.
ARG NODE_VERSION=22.22.3
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /workspace

# ---- deps ------------------------------------------------------------------
FROM base AS deps
# Copy the bare minimum for `pnpm install --frozen-lockfile` to succeed.
# pnpm needs every workspace package.json so it can build the dep graph; we
# copy them individually so the layer cache survives unrelated source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/caption-ui/package.json packages/caption-ui/
COPY packages/config/package.json packages/config/
COPY packages/editor-core/package.json packages/editor-core/
COPY packages/openapi/package.json packages/openapi/
COPY packages/sdk-ts/package.json packages/sdk-ts/
COPY packages/ui/package.json packages/ui/
COPY services/api/package.json services/api/
COPY services/mcp/package.json services/mcp/
COPY services/worker/package.json services/worker/
COPY scripts/husky-install.mjs scripts/husky-install.mjs
RUN pnpm install --frozen-lockfile --filter @vidgen/api...

# ---- src -------------------------------------------------------------------
FROM deps AS src
# Source for the API and the two workspace packages it consumes at runtime.
COPY packages/config packages/config
COPY packages/openapi packages/openapi
COPY services/api services/api

# ---- final -----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
# Bring across the resolved node_modules trees + source. We do not strip
# devDeps further because pnpm already filtered to @vidgen/api...; the
# tree only contains the runtime deps the API workspace needs.
COPY --from=src /workspace ./
WORKDIR /workspace/services/api
# Fastify listens on 0.0.0.0:API_PORT inside the container (default 3001).
EXPOSE 3001
# `pnpm start` runs `tsx src/index.ts` — see services/api/package.json.
CMD ["pnpm", "start"]
