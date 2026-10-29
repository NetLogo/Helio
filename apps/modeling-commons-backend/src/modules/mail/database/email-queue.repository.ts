import type { EmailQueue, Prisma } from '#prisma/index';
import type { EmailQueueRecord } from '#src/modules/mail/database/email-queue.record.ts';
import type { EmailQueueRepositoryPort } from '#src/modules/mail/database/email-queue.repository.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

function narrowContent(record: EmailQueue): EmailQueueRecord {
  return { ...record, content: record.content as Mail.Options };
}

export default function emailQueueRepository({ db }: Dependencies): EmailQueueRepositoryPort {
  return {
    async insertTx(content: Mail.Options, ctx?: TransactionContext): Promise<EmailQueueRecord> {
      const client = ctx ? resolveTransaction(ctx) : db;
      const record = await client.emailQueue.create({
        data: { content: content as Prisma.InputJsonValue },
      });
      return narrowContent(record);
    },

    async findUnsent(
      limit: number,
      maxAttempts: number,
      now: Date,
    ): Promise<Array<EmailQueueRecord>> {
      const records = await db.emailQueue.findMany({
        where: {
          sentAt: null,
          attempts: { lt: maxAttempts },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
      return records.map(narrowContent);
    },

    async markSent(id: string, at: Date): Promise<void> {
      await db.emailQueue.update({ where: { id }, data: { sentAt: at } });
    },

    async markFailed(id: string, error: unknown, nextAttemptAt: Date): Promise<void> {
      await db.emailQueue.update({
        where: { id },
        data: {
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt,
        },
      });
    },

    async deleteSentBefore(cutoff: Date): Promise<number> {
      const { count } = await db.emailQueue.deleteMany({ where: { sentAt: { lt: cutoff } } });
      return count;
    },

    async deleteFailedBefore(cutoff: Date, maxAttempts: number): Promise<number> {
      // markFailed schedules nextAttemptAt after the failure, so a cutoff on it never deletes early.
      const { count } = await db.emailQueue.deleteMany({
        where: {
          sentAt: null,
          attempts: { gte: maxAttempts },
          OR: [
            { nextAttemptAt: { lt: cutoff } },
            { nextAttemptAt: null, createdAt: { lt: cutoff } },
          ],
        },
      });
      return count;
    },
  };
}
