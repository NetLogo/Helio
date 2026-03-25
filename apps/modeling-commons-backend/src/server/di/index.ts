import { makeDependencies } from '#src/modules/index.ts';
import { formatName } from '#src/server/di/util.ts';
import { diContainer, fastifyAwilixPlugin } from '@fastify/awilix';
import { asFunction, Lifetime } from 'awilix';
import type { FastifyInstance } from 'fastify';
import path from 'node:path';

export async function di(fastify: FastifyInstance): Promise<void> {
  diContainer.register({
    ...makeDependencies({
      logger: fastify.log,
      eventBus: fastify.eventBus,
    }),
  });

  await diContainer.loadModules(
    [
      path.join(
        import.meta.dirname,
        '../../modules/**/*.{repository,mapper,service,domain,query}.{js,ts}',
      ),
    ],
    {
      formatName,
      esModules: true,
      resolverOptions: {
        register: asFunction,
        lifetime: Lifetime.SINGLETON,
      },
    },
  );

  await diContainer.loadModules(
    [path.join(import.meta.dirname, '../../modules/**/*.{handler,event-handler}.{js,ts}')],
    {
      formatName,
      esModules: true,
      resolverOptions: {
        asyncInit: 'init',
        register: asFunction,
        lifetime: Lifetime.SINGLETON,
      },
    },
  );

  // Create a dependency injection container
  await fastify.register(fastifyAwilixPlugin, {
    container: diContainer,
    asyncInit: true,
  });
}
