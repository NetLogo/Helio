import type { FastifyInstance } from 'fastify';
import env from '#src/config/env.ts';
import { startDigestProcessor } from '#src/workers/digest-processor.ts';
import { startEmailSender } from '#src/workers/email-sender.ts';
import { startModelDraftJanitor } from '#src/workers/model-draft-janitor.ts';
import { startNotificationJanitor } from '#src/workers/notification-janitor.ts';
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
    notificationDeliveryService,
    notificationDigestService,
    userNotificationRepository,
    mailService,
    modelDraftService,
    boss,
  } = fastify.diContainer.cradle;

  await Promise.all([
    startUserNotificationSubscriber({
      boss,
      eventRepository,
      notificationDeliveryService,
      logger: fastify.log,
    }),
    startModelDraftJanitor({ boss, modelDraftService, logger: fastify.log }),
    startDigestProcessor({
      boss,
      userNotificationRepository,
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
