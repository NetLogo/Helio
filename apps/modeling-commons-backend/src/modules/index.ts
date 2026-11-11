import type { EventBus } from '#src/shared/cqrs/bus.types.ts';
import { prisma } from '#src/shared/db/prisma.client.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import makeRepositoryBase, {
  type RepositoryBaseFactory,
} from '#src/shared/db/repository-base.factory.ts';
import makePrismaTransactionManager from '#src/shared/db/prisma-transaction.manager.ts';
import type { TransactionManager } from '#src/shared/db/transaction.port.ts';
import makeBoss from '#src/shared/jobs/boss.ts';
import type { JobQueue } from '#src/shared/jobs/job-queue.port.ts';
import makePgBossJobQueue from '#src/shared/jobs/pg-boss.job-queue.ts';
import env from '#src/config/env.ts';
import realtimeConfig from '#src/config/realtime.ts';
import { makeRealtimeBroker, type RealtimeBroker } from '#src/shared/realtime/broker.ts';
import { asFunction, asValue, type Resolver } from 'awilix';
import type { PgBoss } from 'pg-boss';
import type { FastifyBaseLogger } from 'fastify';
import type { Bucket, S3Client } from '@aws-sdk/client-s3';
import storage, { bucket } from '#src/lib/storage.ts';
import { makeFileDependencies } from '#src/modules/file/index.ts';
import makeNotificationProducers from '#src/modules/notification-producers.ts';
import { realtimeTopics } from '#src/modules/realtime-topics.ts';
import type { AnyRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';

type Resolvers<T> = {
  [K in keyof T]: Resolver<T[K]>;
};

declare global {
  export interface Dependencies {
    logger: FastifyBaseLogger;
    prisma: ExtendedPrismaClient;
    db: ExtendedPrismaClient;
    storage: S3Client;
    bucket: Bucket;
    eventBus: EventBus;
    repositoryBase: RepositoryBaseFactory;
    transactionManager: TransactionManager;
    boss: PgBoss;
    jobQueue: JobQueue;
    realtimeBroker: RealtimeBroker;
    realtimeTopics: ReadonlyArray<AnyRealtimeTopic>;
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
    storage: asValue(storage),
    bucket: asValue(bucket),
    eventBus: asValue(eventBus),
    repositoryBase: asFunction(makeRepositoryBase),
    transactionManager: asFunction(makePrismaTransactionManager),
    boss: asFunction(() => makeBoss({ logger, workersEnabled: env.workers.enabled })).singleton(),
    jobQueue: asFunction(makePgBossJobQueue).singleton(),
    notificationProducers: asFunction(makeNotificationProducers).singleton(),
    realtimeBroker: asFunction(() =>
      makeRealtimeBroker({
        maxStreamsPerUser: realtimeConfig.streams.maxPerUser,
        maxTopicsPerStream: realtimeConfig.streams.maxTopicsPerStream,
        heartbeatIntervalMs: realtimeConfig.streams.heartbeatIntervalMs,
      }),
    ).singleton(),
    realtimeTopics: asValue(realtimeTopics),
    ...makeFileDependencies(),
  };
}
