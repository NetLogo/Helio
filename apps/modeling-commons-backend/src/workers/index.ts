import type { FastifyInstance } from 'fastify';
import env from '#src/config/env.ts';
import { startDigestProcessor } from '#src/workers/digest-processor.ts';
import { startEmailSender } from '#src/workers/email-sender.ts';
import { startEventProcessor } from '#src/workers/event-processor.ts';
import { startModelDraftJanitor } from '#src/workers/model-draft-janitor.ts';
import { startNotificationJanitor } from '#src/workers/notification-janitor.ts';

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
    eventQueueNotifier,
    emailQueueRepository,
    mailService,
    emailQueueNotifier,
    modelDraftService,
  } = fastify.diContainer.cradle;
  const connectionString = env.db.url;

  const [eventBoss, janitorBoss, digestBoss, notificationJanitorBoss, emailBoss] =
    await Promise.all([
      startEventProcessor({
        connectionString,
        eventRepository,
        userNotificationService,
        eventQueueNotifier,
        logger: fastify.log,
      }),
      startModelDraftJanitor({ connectionString, modelDraftService, logger: fastify.log }),
      startDigestProcessor({
        connectionString,
        userNotificationRepository,
        notificationPreferenceRepository,
        userNotificationDomain,
        notificationDigestService,
        logger: fastify.log,
      }),
      startNotificationJanitor({
        connectionString,
        userNotificationRepository,
        emailQueueRepository,
        logger: fastify.log,
      }),
      startEmailSender({
        connectionString,
        emailQueueRepository,
        mailService,
        emailQueueNotifier,
        logger: fastify.log,
      }),
    ]);

  fastify.addHook('onClose', async () => {
    fastify.log.info({
      name: 'workers',
      message: 'Stopping pg-boss workers…',
    });
    await Promise.allSettled([
      eventBoss.stop({ graceful: true }),
      janitorBoss.stop({ graceful: true }),
      digestBoss.stop({ graceful: true }),
      notificationJanitorBoss.stop({ graceful: true }),
      emailBoss.stop({ graceful: true }),
    ]);
  });
}
