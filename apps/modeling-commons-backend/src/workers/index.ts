import type { FastifyInstance } from 'fastify';
import env from '#src/config/env.ts';
import workersConfig from '#src/config/workers.ts';
import { startDigestProcessor } from '#src/workers/digest-processor.ts';
import { startEmailSender } from '#src/workers/email-sender.ts';
import { startModelDraftJanitor } from '#src/workers/model-draft-janitor.ts';
import { startNotificationJanitor } from '#src/workers/notification-janitor.ts';
import { retireQueues } from '#src/workers/queues.ts';
import { startRealtimeSubscriber } from '#src/workers/realtime-subscriber.ts';
import { startUserNotificationSubscriber } from '#src/workers/user-notification-subscriber.ts';

export async function startWorkers(fastify: FastifyInstance): Promise<void> {
  if (!env.workers.enabled) {
    fastify.log.info({
      name: 'workers',
      message: 'Workers are disabled by configuration, skipping initialization.',
    });
    return;
  }

  const {
    eventRepository,
    userNotificationService,
    notificationDigestService,
    userNotificationRepository,
    notificationPreferenceRepository,
    userNotificationDomain,
    mailService,
    modelDraftService,
    boss,
    db,
  } = fastify.diContainer.cradle;

  await retireQueues(boss, workersConfig.retiredQueueNames);
  await Promise.all([
    startUserNotificationSubscriber({
      boss,
      eventRepository,
      userNotificationService,
      logger: fastify.log,
    }),
    startRealtimeSubscriber({ boss, db, eventRepository, logger: fastify.log }),
    startModelDraftJanitor({ boss, modelDraftService, logger: fastify.log }),
    startDigestProcessor({
      boss,
      userNotificationRepository,
      notificationPreferenceRepository,
      userNotificationDomain,
      notificationDigestService,
      logger: fastify.log,
    }),
    startNotificationJanitor({
      boss,
      userNotificationRepository,
      logger: fastify.log,
    }),
    startEmailSender({
      boss,
      mailService,
      logger: fastify.log,
    }),
  ]);
}
