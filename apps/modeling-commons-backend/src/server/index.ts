import env from '#src/config/env.ts';
import { di } from '#src/server/di/index.ts';
import AutoLoad from '@fastify/autoload';
import Cors from '@fastify/cors';
import Helmet from '@fastify/helmet';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import UnderPressure from '@fastify/under-pressure';
import type { FastifyInstance } from 'fastify';
import path from 'node:path';

export default async function createServer(fastify: FastifyInstance): Promise<FastifyInstance> {
  // Set sensible default security headers
  await fastify.register(Helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        // General default source
        defaultSrc: [`'self'`],
        // Allow specific image sources (e.g., data URIs used by the Swagger validator)
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        // Allow specific script sources, potentially including 'unsafe-inline' or nonces
        scriptSrc: [`'self'`, `https:`, `'unsafe-inline'`],
        // Allow specific style sources, including 'unsafe-inline' for some inline styles
        styleSrc: [`'self'`, `'unsafe-inline'`],
        // Allow WebAssembly to function (required by recent Scalar versions)
        workerSrc: [`'self'`, `'unsafe-eval'`],
        // Add other directives as needed
      },
    },
  });

  // Enables the use of CORS in a Fastify application.
  // https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
  // `origin: false` disables CORS headers entirely (suitable for same-origin / server-to-server).
  // Set to `true` or a specific origin string/array for cross-origin frontends.
  await fastify.register(Cors, {
    origin: env.isDevelopment
      ? (_, callback) => {
          callback(null, true); // Allow all origins in development for ease of testing
        }
      : (env.cors.allowedOrigins ?? true),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  // Auto-load plugins
  await fastify.register(AutoLoad, {
    dir: path.join(import.meta.dirname, 'plugins'),
    dirNameRoutePrefix: false,
  });

  // Configure Dependency Injection
  await di(fastify);

  // Auto-load routes
  await fastify.register(AutoLoad, {
    dir: path.join(import.meta.dirname, '../modules'),
    dirNameRoutePrefix: false,
    options: {
      prefix: '/api',
    },
    indexPattern: /^$/, // Ignore index files
    matchFilter: (thisPath) => /\.(route|resolver)\.ts$/.test(thisPath),
  });

  await fastify.register(UnderPressure, {
    healthCheck: async () => true,
    healthCheckInterval: 5000,
    exposeStatusRoute: {
      routeOpts: { logLevel: 'silent' },
      url: '/health',
    },
  });

  return fastify.withTypeProvider<TypeBoxTypeProvider>();
}
