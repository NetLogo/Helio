import path from 'node:path';

import { TypeBoxValidatorCompiler, type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';

import AutoLoad from '@fastify/autoload';
import Cors from '@fastify/cors';
import Helmet from '@fastify/helmet';
import UnderPressure from '@fastify/under-pressure';

import env from '#src/config/env.ts';
import { di } from '#src/server/di/index.ts';
import { startWorkers } from '#src/workers/index.ts';

export default async function createServer(fastify: FastifyInstance): Promise<FastifyInstance> {
  // Set sensible default security headers
  await fastify.register(Helmet, {
    global: true,
    contentSecurityPolicy: {
      // There is no HTML content served by this backend,
      // so we can be very strict with CSP. However, we expose
      // API documentation for local development, which requires
      // a looser policy.
      // --Omar Ibrahim, May 18 26
      directives: env.isDevelopment
        ? {
            scriptSrc: [`'self'`, `'unsafe-inline'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:'],
            fontSrc: [`'self'`, 'data:'],
            connectSrc: [`'self'`],
          }
        : {
            defaultSrc: [`'none'`],
            frameAncestors: [`'none'`],
            baseUri: [`'none'`],
            formAction: [`'none'`],
            objectSrc: [`'none'`],
            scriptSrc: [`'none'`],
            styleSrc: [`'none'`],
            imgSrc: [`'none'`],
            fontSrc: [`'none'`],
            connectSrc: [`'none'`],
          },
    },
  });

  // Enables the use of CORS in a Fastify application.
  // https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
  // `origin: false` disables CORS headers entirely (suitable for same-origin / server-to-server).
  // Set to `true` or a specific origin string/array for cross-origin frontends.
  await fastify.register(Cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, false);
        return;
      }

      if (env.isDevelopment || env.cors.allowedOrigins?.includes(origin)) {
        // Request from localhost or your production domain will pass
        cb(null, true);
        return;
      }
      // Generate an error on other origins, disabling access
      cb(new Error('Not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  // Auto-load plugins
  await fastify.register(AutoLoad, {
    dir: path.join(import.meta.dirname, 'plugins'),
    dirNameRoutePrefix: false,
    ignorePattern: /\.spec\.ts$/,
  });

  // Configure Dependency Injection
  await di(fastify);

  await startWorkers(fastify);

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
    maxEventLoopDelay: 1500,
    maxEventLoopUtilization: 0.98,
    exposeStatusRoute: {
      routeOpts: { logLevel: 'silent' },
      url: '/api/health',
    },
  });

  return fastify
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider<TypeBoxTypeProvider>();
}
