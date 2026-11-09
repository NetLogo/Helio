import workersConfig from '#src/config/workers.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';
import type Mail from 'nodemailer/lib/mailer/index.js';

const config = workersConfig.sendEmail;

export async function startEmailSender({
  boss,
  mailService,
  logger,
}: {
  boss: PgBoss;
  mailService: Pick<Dependencies['mailService'], 'sendMailAsync'>;
  logger: FastifyBaseLogger;
}): Promise<void> {
  await registerQueue(boss, config);

  await boss.work<Mail.Options>(
    config.queueName,
    {
      batchSize: 1,
      localConcurrency: config.work.localConcurrency,
      pollingIntervalSeconds: workersConfig.polling.intervalSeconds,
    },
    async (jobs) => {
      for (const job of jobs) await mailService.sendMailAsync(job.data);
    },
  );

  logger.info('Email sender started');
}
