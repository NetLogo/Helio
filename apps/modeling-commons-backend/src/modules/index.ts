import type { CommandBus, EventBus, QueryBus } from '#src/shared/cqrs/bus.types.ts';
import { prisma } from '#src/shared/db/prisma.client.ts';
import type { PrismaClient } from '@prisma/client';
import { asValue, type Resolver } from 'awilix';
import type { FastifyBaseLogger } from 'fastify';

type Resolvers<T> = {
  [K in keyof T]: Resolver<T[K]>;
};

declare global {
  export interface Dependencies {
    logger: FastifyBaseLogger;
    prisma: PrismaClient;
    queryBus: QueryBus;
    commandBus: CommandBus;
    eventBus: EventBus;
  }
}

export function makeDependencies({
  logger,
  queryBus,
  commandBus,
  eventBus,
}: {
  logger: FastifyBaseLogger;
  queryBus: QueryBus;
  commandBus: CommandBus;
  eventBus: EventBus;
}): Resolvers<Dependencies> {
  return {
    logger: asValue(logger),
    prisma: asValue(prisma),
    queryBus: asValue(queryBus),
    commandBus: asValue(commandBus),
    eventBus: asValue(eventBus),
  };
}
