# syntax=docker/dockerfile:1

# Base
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app

# Development Dependencies
FROM base AS deps-dev

COPY package.json yarn.lock /monorepo/
COPY packages /monorepo/packages/
COPY . /monorepo/apps/modeling-commons-frontend/

WORKDIR /monorepo

# Install all dependencies (including devDependencies)
RUN yarn install --frozen-lockfile --ignore-scripts

RUN cp -r /monorepo/node_modules /app/

# Build
FROM deps-dev AS builder

COPY . /monorepo/apps/modeling-commons-frontend/
WORKDIR /monorepo/apps/modeling-commons-frontend

# Build the Nuxt app
RUN yarn nuxt:build

# Production Dependencies
FROM base AS deps-prod

COPY package.json yarn.lock /monorepo/
COPY packages /monorepo/packages/
COPY apps/modeling-commons-frontend/package.json /monorepo/apps/modeling-commons-frontend/

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

# Copy frontend source
COPY apps/modeling-commons-frontend/package.json ./
COPY apps/modeling-commons-frontend/app ./app
COPY apps/modeling-commons-frontend/public ./public
COPY apps/modeling-commons-frontend/nuxt.config.ts ./

EXPOSE 3005

# Dev mode
CMD ["yarn", "nuxt:dev", "--port", "3005"]

# Production
FROM base AS production

ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nuxt -u 1001 -G nodejs

# Copy production node_modules from deps stage
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /monorepo/apps/modeling-commons-frontend/.nuxt ./.nuxt
COPY --from=builder /monorepo/apps/modeling-commons-frontend/package.json ./
COPY --from=builder /monorepo/apps/modeling-commons-frontend/public ./public

USER nuxt

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3005/').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]

CMD ["node", ".nuxt/dist/server/server.mjs"]
