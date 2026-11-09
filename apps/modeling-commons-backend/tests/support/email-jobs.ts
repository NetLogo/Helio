import type { FastifyInstance } from 'fastify';
import type Mail from 'nodemailer/lib/mailer/index.js';
import type { JobWithMetadata } from 'pg-boss';
import workersConfig from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';

export const emailQueueName = workersConfig.sendEmail.queueName;
export const emailDeadLetterQueueName = getDeadLetterQueueName(emailQueueName);

export type EmailJob = JobWithMetadata<Mail.Options>;

export async function listEmailJobs(
  server: FastifyInstance,
  addresses: Array<string>,
  queueName: string = emailQueueName,
): Promise<Array<EmailJob>> {
  const { boss } = server.diContainer.cradle;
  const jobs = await boss.findJobs<Mail.Options>(queueName);
  return jobs
    .filter((job) => addresses.includes(String(job.data.to)))
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
): Promise<Array<EmailJob> | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const jobs = await listEmailJobs(server, addresses, queueName);
    if (isDone(jobs)) return jobs;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return undefined;
}

export function haveAllCompleted(jobs: Array<EmailJob>): boolean {
  return jobs.length > 0 && jobs.every((job) => job.state === 'completed');
}
