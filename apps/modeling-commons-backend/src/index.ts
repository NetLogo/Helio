import { env } from '#src/config/index.ts';
import server from '#src/server/index.ts';
import { prisma } from '#src/shared/db/prisma.client.ts';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';

async function init(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: env.log.level,
      redact: ['headers.authorization'],
    },
    genReqId: (req) => {
      // header best practice: don't use "x-" https://www.rfc-editor.org/info/rfc6648 and keep it lowercase
      return (req.headers['request-id'] as string) ?? randomUUID();
    },
    routerOptions: {
      ignoreDuplicateSlashes: true,
    },
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
  });

  await server(fastify);

  // Graceful shutdown: close DB connection when the server shuts down
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Closing database connection…');
    await prisma.$disconnect();
  });

  // Handle termination signals for graceful shutdown
  const shutDown = async (signal: string): Promise<void> => {
    fastify.log.info(`Received ${signal}, shutting down gracefully…`);
    await fastify.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => {
    shutDown('SIGTERM').catch((error: unknown) => {
      // @ts-expect-error error type is unknown
      fastify.log.error('Error during shutdown:', error);
      process.exit(1);
    });
  });
  process.on('SIGINT', () => {
    shutDown('SIGINT').catch((error: unknown) => {
      // @ts-expect-error error type is unknown
      fastify.log.error('Error during shutdown:', error);
      process.exit(1);
    });
  });

  try {
    await fastify.listen({ port: env.server.port, host: env.server.host });
    fastify.log.info('Server is ready');
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

await init();
