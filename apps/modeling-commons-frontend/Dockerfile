# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /monorepo

FROM base AS builder

COPY package.json yarn.lock turbo.json ./
COPY scripts ./scripts/
COPY packages packages/
COPY apps/modeling-commons-frontend apps/modeling-commons-frontend/

ENV NUXT_TELEMETRY_DISABLED=1
ENV HELIO_HEADLESS=1
RUN yarn install --ignore-scripts --frozen-lockfile
RUN yarn turbo run create:env
RUN yarn turbo run build
RUN yarn install --force --frozen-lockfile
RUN yarn turbo run init

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN cd apps/modeling-commons-frontend && yarn nuxt:build

FROM node:24-alpine

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV NITRO_PORT=3005

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder /monorepo/apps/modeling-commons-frontend/.output ./.output

USER nuxt
EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3005/').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]

CMD ["dumb-init", "node", ".output/server/index.mjs"]
