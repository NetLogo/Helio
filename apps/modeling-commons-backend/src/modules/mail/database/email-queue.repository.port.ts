import type { EmailQueueRecord } from '#src/modules/mail/database/email-queue.record.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

export interface EmailQueueRepositoryPort {
  insertTx: (content: Mail.Options, ctx?: TransactionContext) => Promise<EmailQueueRecord>;
  findUnsent: (limit: number, maxAttempts: number, now: Date) => Promise<Array<EmailQueueRecord>>;
  markSent: (id: string, at: Date) => Promise<void>;
  markFailed: (id: string, error: unknown, nextAttemptAt: Date) => Promise<void>;
  deleteSentBefore: (cutoff: Date) => Promise<number>;
  deleteFailedBefore: (cutoff: Date, maxAttempts: number) => Promise<number>;
}
