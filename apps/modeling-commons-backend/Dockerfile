# syntax=docker/dockerfile:1
FROM node:24-alpine
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production HOST=0.0.0.0 OTEL_SDK_DISABLED=true
RUN addgroup -g 1001 -S nodejs && adduser -S fastify -u 1001 -G nodejs
WORKDIR /app
COPY . .
USER fastify
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"]
CMD ["dumb-init", "node", "--import", "./src/instrumentation.ts", "./src/index.ts"]
