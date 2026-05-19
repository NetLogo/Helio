import Fastify from 'fastify';
import server from '../../src/server/index.ts';
import { isTimingEnabled, recordRequest } from './timing-collector.ts';

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: 'warn',
    },
    disableRequestLogging: true,
    routerOptions: {
      ignoreDuplicateSlashes: true,
    },
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
  });

  await server(app);

  if (isTimingEnabled()) {
    app.addHook('onResponse', async (request, reply) => {
      recordRequest({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        elapsedMs: reply.elapsedTime,
      });
    });
  }

  return app;
};
