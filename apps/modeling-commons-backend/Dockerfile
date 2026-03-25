# syntax=docker/dockerfile:1

# Base
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app

# Development Dependencies
FROM base AS deps-dev

COPY package.json yarn.lock /monorepo/
COPY packages /monorepo/packages/
COPY . /monorepo/apps/modeling-commons-backend/

WORKDIR /monorepo

# Install all dependencies (including devDependencies)
RUN yarn install --frozen-lockfile --ignore-scripts

RUN cp -r /monorepo/node_modules /app/

# Build
FROM deps-dev AS builder

COPY . /monorepo/apps/modeling-commons-backend/
WORKDIR /monorepo/apps/modeling-commons-backend

# Build with esbuild (bundled + tree-shaken)
RUN yarn add -D esbuild && \
    npx esbuild src/index.ts \
      --bundle \
      --platform=node \
      --target=esnext \
      --format=esm \
      --outfile=dist/index.js \
      --external:./src/instrumentation.ts && \
    npx esbuild src/instrumentation.ts \
      --bundle \
      --platform=node \
      --target=esnext \
      --format=esm \
      --outfile=dist/instrumentation.js

# Production Dependencies
FROM base AS deps-prod

COPY package.json yarn.lock /monorepo/
COPY packages/modeling-commons-shared /monorepo/packages/modeling-commons-shared/
COPY apps/modeling-commons-backend/package.json /monorepo/apps/modeling-commons-backend/

WORKDIR /monorepo

RUN yarn install --frozen-lockfile --production --ignore-scripts --workspace-root

RUN cp -r /monorepo/node_modules /app/

# Development
FROM base AS development

ENV NODE_ENV=development
ENV HOST=0.0.0.0

# Copy all monorepo files (full workspace)
COPY . /monorepo/

WORKDIR /monorepo

# Install all dependencies with full workspace
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy installed node_modules to app
RUN cp -r /monorepo/node_modules /app/

WORKDIR /app

# Copy backend source (volumes will overlay for live reload)
COPY apps/modeling-commons-backend/package.json ./
COPY apps/modeling-commons-backend/src ./src

EXPOSE 3000

# Watch mode (volumes mount live code)
CMD ["node", "--import", "./src/instrumentation.ts", "--watch", "src/index.ts"]

# Production
FROM base AS production

# dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
# Bind to all interfaces so the container is reachable from the Docker network
ENV HOST=0.0.0.0
# OpenTelemetry disabled by default; set to "false" and configure
# OTEL_EXPORTER_OTLP_ENDPOINT to enable telemetry export.
ENV OTEL_SDK_DISABLED=true

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S fastify -u 1001 -G nodejs

# Copy production node_modules from deps stage
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy built & bundled application (tree-shaken, no TS source)
COPY --from=builder /monorepo/apps/modeling-commons-backend/dist ./dist

USER fastify

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]

CMD ["dumb-init", "node", "--import", "./dist/instrumentation.js", "./dist/index.js"]
