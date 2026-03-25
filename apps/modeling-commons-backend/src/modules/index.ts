import type { EventBus } from '#src/shared/cqrs/bus.types.ts';
import { prisma } from '#src/shared/db/prisma.client.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import makeRepositoryBase, {
  type RepositoryBaseFactory,
} from '#src/shared/db/repository-base.factory.ts';
import makePrismaTransactionManager from '#src/shared/db/prisma-transaction.manager.ts';
import type { TransactionManager } from '#src/shared/db/transaction.port.ts';
import { asFunction, asValue, type Resolver } from 'awilix';
import type { FastifyBaseLogger } from 'fastify';

type Resolvers<T> = {
  [K in keyof T]: Resolver<T[K]>;
};

declare global {
  export interface Dependencies {
    logger: FastifyBaseLogger;
    prisma: ExtendedPrismaClient;
    db: ExtendedPrismaClient;
    eventBus: EventBus;
    repositoryBase: RepositoryBaseFactory;
    transactionManager: TransactionManager;
  }
}

export function makeDependencies({
  logger,
  eventBus,
}: {
  logger: FastifyBaseLogger;
  eventBus: EventBus;
}): Partial<Resolvers<Dependencies>> {
  return {
    logger: asValue(logger),
    prisma: asValue(prisma),
    db: asValue(prisma),
    eventBus: asValue(eventBus),
    repositoryBase: asFunction(makeRepositoryBase),
    transactionManager: asFunction(makePrismaTransactionManager),
  };
}
