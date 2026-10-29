import workersConfig from '#src/config/workers.ts';
import type { EmailQueueRecord } from '#src/modules/mail/database/email-queue.record.ts';
import type { EmailQueueRepositoryPort } from '#src/modules/mail/database/email-queue.repository.port.ts';
import type { QueueNotifier } from '#src/shared/jobs/queue.notifier.ts';
import { computeBackoffDelayMs } from '#src/shared/utils/backoff.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const config = workersConfig.emailSender;

export async function startEmailSender({
  connectionString,
  emailQueueRepository,
  mailService,
  emailQueueNotifier,
  logger,
}: {
  connectionString: string;
  emailQueueRepository: EmailQueueRepositoryPort;
  mailService: Pick<Dependencies['mailService'], 'sendMailAsync'>;
  emailQueueNotifier: QueueNotifier;
  logger: FastifyBaseLogger;
}): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);
  const batchSize = config.emailBatchSize;

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error');
  });

  await boss.start();
  await boss.createQueue(config.queueName, { policy: config.queuePolicy });

  function computeNextAttemptAt(email: EmailQueueRecord): Date {
    return new Date(Date.now() + computeBackoffDelayMs(config.retryBaseMs, email.attempts));
  }

  async function sendOne(email: EmailQueueRecord): Promise<boolean> {
    return mailService.sendMailAsync(email.content).then(
      async () => {
        await emailQueueRepository.markSent(email.id, new Date());
        return true;
      },
      async (error: unknown) => {
        await emailQueueRepository.markFailed(email.id, error, computeNextAttemptAt(email));
        return false;
      },
    );
  }

  async function drainOnce(): Promise<{ fetched: number; sent: number }> {
    const emails = await emailQueueRepository.findUnsent(
      batchSize,
      config.maxEmailAttempts,
      new Date(),
    );
    let sent = 0;
    for (const email of emails) if (await sendOne(email)) sent++;
    return { fetched: emails.length, sent };
  }

  await boss.work(config.queueName, async () => {
    let handled = 0;
    for (let pass = 0; pass < config.maxDrainPasses; pass++) {
      const result = await drainOnce();
      handled += result.fetched;
      if (result.fetched < batchSize || result.sent === 0) break;
    }
    logger.debug(`Handled ${handled} queued emails`);
  });

  await boss.schedule(config.queueName, config.cronExpression);

  emailQueueNotifier.bind(async () => {
    await boss.send(config.queueName, {});
  });

  logger.info('Email sender started');
  return boss;
}
