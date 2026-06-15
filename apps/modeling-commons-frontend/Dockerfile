# syntax=docker/dockerfile:1
FROM node:24-alpine
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production HOST=0.0.0.0 NITRO_PORT=3005

# Sensible default values
ARG NUXT_PUBLIC_API_BASE="https://beta.modelingcommons.org"
ARG NUXT_PUBLIC_AUTH_BASE="https://beta.modelingcommons.org/api/auth"
ARG NUXT_PUBLIC_APP_URL="https://beta.modelingcommons.org"
ARG NUXT_STORAGE_BASE_URL="https://cdn.modelingcommons.org"
ARG NUXT_PUBLIC_CDN_URL="https://cdn.modelingcommons.org"
ARG NUXT_PUBLIC_NETLOGO_WEB_URL="https://www.netlogoweb.org"
ARG NUXT_PUBLIC_GA_TRACKING_ID="G-VJ4WPV2Q5B"

# Pass build args as environment variables to be used in the application
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}
ENV NUXT_PUBLIC_AUTH_BASE=${NUXT_PUBLIC_AUTH_BASE}
ENV NUXT_PUBLIC_APP_URL=${NUXT_PUBLIC_APP_URL}
ENV NUXT_STORAGE_BASE_URL=${NUXT_STORAGE_BASE_URL}
ENV NUXT_PUBLIC_CDN_URL=${NUXT_PUBLIC_CDN_URL}
ENV NUXT_PUBLIC_NETLOGO_WEB_URL=${NUXT_PUBLIC_NETLOGO_WEB_URL}
ENV NUXT_PUBLIC_GA_TRACKING_ID=${NUXT_PUBLIC_GA_TRACKING_ID}

RUN addgroup -g 1001 -S nodejs && adduser -S nuxt -u 1001 -G nodejs
WORKDIR /app
COPY .output .output
USER nuxt
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3005/').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]
CMD ["dumb-init", "node", ".output/server/index.mjs"]
