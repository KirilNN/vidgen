# apps/web — production Dockerfile (T-016)
#
# Multi-stage build mirroring services/api/Dockerfile but producing the
# Next.js standalone bundle.
#
#   base:    node:22-alpine + pnpm 9.15.9 (matches engines.node, packageManager).
#   deps:    copy workspace package.json files + lockfile → frozen install
#            for the @vidgen/web workspace and its transitive deps. Splitting
#            this from the sources keeps the layer cache warm.
#   builder: copy source for @vidgen/web + the two workspace packages it
#            imports (@vidgen/config, @vidgen/sdk-ts) and run `next build`.
#            `output: "standalone"` emits a self-contained server.
#   runtime: minimal image with just the standalone output + static assets.
#
# Why pnpm v9: matches packageManager pin at the repo root.
# Why alpine: ~50 MB base; no native modules needed for the web app.
ARG NODE_VERSION=22.22.3
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /workspace

# ---- deps ------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
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
RUN pnpm install --frozen-lockfile --filter @vidgen/web...

# ---- builder ---------------------------------------------------------------
FROM deps AS builder
COPY packages/config packages/config
COPY packages/sdk-ts packages/sdk-ts
COPY apps/web apps/web
# Next's build needs to write the .next dir under apps/web.
WORKDIR /workspace/apps/web
# Disable Next telemetry in CI/build contexts.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec next build

# ---- runtime ---------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone output is rooted at the build's outputFileTracingRoot (the
# repo root = /workspace). server.js sits at apps/web/server.js inside
# that tree, so WORKDIR must be /workspace.
WORKDIR /workspace

# The standalone output includes a tiny node_modules + server.js. Copying
# it from the builder lets us drop pnpm + the rest of the workspace.
COPY --from=builder /workspace/apps/web/.next/standalone /workspace
COPY --from=builder /workspace/apps/web/.next/static /workspace/apps/web/.next/static
COPY --from=builder /workspace/apps/web/public /workspace/apps/web/public

# Next listens on PORT (default 3000) on 0.0.0.0 inside the container.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
