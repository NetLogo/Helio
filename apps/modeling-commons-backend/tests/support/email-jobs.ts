import type { FastifyInstance } from 'fastify';
import type Mail from 'nodemailer/lib/mailer/index.js';
import type { JobWithMetadata } from 'pg-boss';
import workersConfig from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';
import { pollUntil } from './poll.ts';

export const emailQueueName = workersConfig.sendEmail.queueName;
export const emailDeadLetterQueueName = getDeadLetterQueueName(emailQueueName);

export type EmailJob = JobWithMetadata<Mail.Options>;

export async function findEmailJobsByRecipient(
  server: FastifyInstance,
  addresses: Array<string>,
  queueName: string = emailQueueName,
): Promise<Array<EmailJob>> {
  const { boss } = server.diContainer.cradle;
  const perAddress = await Promise.all(
    addresses.map((address) => boss.findJobs<Mail.Options>(queueName, { data: { to: address } })),
  );
  return perAddress
    .flat()
    .sort((left, right) => left.createdOn.getTime() - right.createdOn.getTime());
}

export async function waitForEmailJobs(
  server: FastifyInstance,
  addresses: Array<string>,
  isDone: (jobs: Array<EmailJob>) => boolean,
  {
    timeoutMs = 10_000,
    queueName = emailQueueName,
  }: { timeoutMs?: number; queueName?: string } = {},
): Promise<Array<EmailJob>> {
  return pollUntil(() => findEmailJobsByRecipient(server, addresses, queueName), isDone, {
    timeoutMs,
    intervalMs: 250,
  });
}

export function areAllJobsCompleted(jobs: Array<EmailJob>): boolean {
  return jobs.length > 0 && jobs.every((job) => job.state === 'completed');
}
