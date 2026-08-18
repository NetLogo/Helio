# syntax=docker/dockerfile:1
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production HOST=0.0.0.0 NITRO_PORT=3005

# Sensible default values
ARG NUXT_PUBLIC_API_BASE="https://www.modelingcommons.org"
ARG NUXT_PUBLIC_AUTH_BASE="https://www.modelingcommons.org/api/auth"
ARG NUXT_PUBLIC_APP_URL="https://www.modelingcommons.org"
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

RUN groupadd -r -g 1001 nodejs && useradd -r -u 1001 -g nodejs -s /usr/sbin/nologin nuxt
WORKDIR /app
COPY .output .output

# Nitro symlinks sharp's native packages to @version-suffixed dirs under
# .output/.nitro, which breaks the $ORIGIN-relative rpath the sharp binding uses
# to find libvips at load time (ERR_DLOPEN_FAILED: libvips-cpp.so). Reinstall
# sharp (same traced version) as a flat tree so the rpath resolves.
RUN SHARP_VERSION="$(node -p "require('./.output/server/node_modules/sharp/package.json').version")" \
  && npm install --no-save --no-audit --no-fund \
      --os=linux --cpu="$(node -p process.arch)" --libc=glibc \
      --prefix /tmp/sharp "sharp@${SHARP_VERSION}" \
  && rm -rf .output/server/node_modules/sharp .output/server/node_modules/@img \
  && cp -R /tmp/sharp/node_modules/sharp .output/server/node_modules/sharp \
  && cp -R /tmp/sharp/node_modules/@img .output/server/node_modules/@img \
  && rm -rf /tmp/sharp

USER nuxt
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3005/').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]
CMD ["dumb-init", "node", ".output/server/index.mjs"]
