import { makeDependencies } from '#src/modules/index.ts';
import { formatName } from '#src/server/di/util.ts';
import type { EventBus } from '#src/shared/cqrs/bus.types.ts';
import { diContainer, fastifyAwilixPlugin } from '@fastify/awilix';
import { asFunction, Lifetime, type AwilixContainer } from 'awilix';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import path from 'node:path';

export async function loadDependencies(
  container: AwilixContainer,
  externals: { logger: FastifyBaseLogger; eventBus: EventBus },
): Promise<void> {
  container.register({ ...makeDependencies(externals) });

  await container.loadModules(
    [
      path.join(
        import.meta.dirname,
        '../../modules/**/*.{repository,mapper,service,domain,query,storage,producer}.{js,ts}',
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
}

export async function di(fastify: FastifyInstance): Promise<void> {
  await loadDependencies(diContainer, { logger: fastify.log, eventBus: fastify.eventBus });

  // Create a dependency injection container
  await fastify.register(fastifyAwilixPlugin, {
    container: diContainer,
    asyncInit: true,
  });
}
