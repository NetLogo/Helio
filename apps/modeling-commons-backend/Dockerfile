# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /monorepo

FROM base AS deps

COPY package.json yarn.lock ./
COPY packages packages/
COPY apps/modeling-commons-backend/package.json apps/modeling-commons-backend/
COPY apps/modeling-commons-backend/prisma apps/modeling-commons-backend/prisma/

RUN node -e " \
  const p = require('./package.json'); \
  p.workspaces = { packages: ['apps/*', 'packages/*'], nohoist: ['**/*'] }; \
  require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2));"

RUN yarn install --frozen-lockfile --production --ignore-scripts

RUN cd apps/modeling-commons-backend && \
  npx prisma generate

RUN find apps/modeling-commons-backend/node_modules/@prisma/client/runtime \
  \( -name '*cockroachdb*' -o -name '*mysql*' -o -name '*sqlite*' -o -name '*sqlserver*' \
  -o -name '*edge*' -o -name '*browser*' -o -name '*.map' \) \
  -delete

RUN rm -rf node_modules/@prisma/engines \
  node_modules/prisma \
  node_modules/@esbuild \
  node_modules/typescript \
  node_modules/prettier \
  node_modules/better-sqlite3 \
  apps/modeling-commons-backend/node_modules/@prisma/engines \
  apps/modeling-commons-backend/node_modules/prisma \
  apps/modeling-commons-backend/node_modules/@esbuild \
  apps/modeling-commons-backend/node_modules/typescript \
  apps/modeling-commons-backend/node_modules/prettier \
  apps/modeling-commons-backend/node_modules/better-sqlite3 \
  apps/modeling-commons-backend/node_modules/@img/sharp-linux-arm64 \
  apps/modeling-commons-backend/node_modules/@img/sharp-libvips-linux-arm64 \
  apps/modeling-commons-backend/node_modules/@vue

WORKDIR /monorepo/apps/modeling-commons-backend

FROM node:24-alpine

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV OTEL_SDK_DISABLED=true
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library

RUN addgroup -g 1001 -S nodejs && \
  adduser -S fastify -u 1001 -G nodejs

WORKDIR /monorepo

COPY --from=deps /monorepo/node_modules ./node_modules
COPY --from=deps /monorepo/apps/modeling-commons-backend/node_modules ./apps/modeling-commons-backend/node_modules
COPY --from=deps /monorepo/apps/modeling-commons-backend/generated ./apps/modeling-commons-backend/generated
COPY --from=deps /monorepo/packages/emails ./packages/emails
COPY --from=deps /monorepo/packages/typescript-config ./packages/typescript-config
COPY --from=deps /monorepo/packages/eslint-config ./packages/eslint-config
COPY --from=deps /monorepo/packages/modeling-commons-shared ./packages/modeling-commons-shared

COPY apps/modeling-commons-backend/src ./apps/modeling-commons-backend/src
COPY apps/modeling-commons-backend/prisma ./apps/modeling-commons-backend/prisma
COPY apps/modeling-commons-backend/package.json ./apps/modeling-commons-backend/package.json
COPY package.json ./package.json

RUN find /monorepo/packages -name node_modules -prune -o -type f ! -perm -a+r -exec chmod a+r {} +

USER fastify
EXPOSE 3000

WORKDIR /monorepo/apps/modeling-commons-backend

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]

CMD ["dumb-init", "node", "--import", "./src/instrumentation.ts", "./src/index.ts"]
