# syntax=docker/dockerfile:1
# Production image: minimal bundle with only runtime dependencies

FROM node:24-alpine AS base

RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app

# Install runtime dependencies only
FROM base AS deps

COPY package.json yarn.lock /monorepo/
COPY packages/modeling-commons-shared /monorepo/packages/modeling-commons-shared/
COPY apps/modeling-commons-backend/package.json /monorepo/apps/modeling-commons-backend/

WORKDIR /monorepo

RUN yarn install --frozen-lockfile --production --ignore-scripts

RUN cp -r /monorepo/node_modules /app/

# Build the application
FROM base AS builder

COPY package.json yarn.lock /monorepo/
COPY packages /monorepo/packages/
COPY apps/modeling-commons-backend /monorepo/apps/modeling-commons-backend/

WORKDIR /monorepo

RUN yarn install --frozen-lockfile --ignore-scripts

RUN cd /monorepo/apps/modeling-commons-backend && \
    yarn add -D esbuild && \
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

# Final production image: only dist/ + node_modules
FROM base

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV OTEL_SDK_DISABLED=true

RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001 -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /monorepo/apps/modeling-commons-backend/dist ./dist

USER fastify

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]

CMD ["dumb-init", "node", "--import", "./dist/instrumentation.js", "./dist/index.js"]
