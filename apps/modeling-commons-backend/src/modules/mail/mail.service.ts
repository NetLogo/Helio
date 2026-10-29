import transporter from '#src/lib/mail.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { SentMessageInfo } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';

export default function makeMailService({
  logger,
  emailQueueRepository,
  emailQueueNotifier,
}: Dependencies) {
  function nudgeEmailQueue(): void {
    void emailQueueNotifier.nudge().catch((error: unknown) => {
      logger.error({ name: 'Mail Service', message: 'Failed to nudge the email queue', error });
    });
  }

  return {
    async enqueue(content: Mail.Options, ctx?: TransactionContext): Promise<void> {
      await emailQueueRepository.insertTx(content, ctx);
      if (ctx) ctx.onCommit(nudgeEmailQueue);
      else nudgeEmailQueue();
    },

    async sendMailAsync(content: Mail.Options): Promise<SentMessageInfo> {
      try {
        const info = await transporter.sendMail(content);
        logger.info({ name: 'Mail Service', message: 'Email sent successfully', info });
        return info;
      } catch (error) {
        logger.error({ name: 'Mail Service', message: 'Failed to send email', error });
        throw error;
      }
    },
  };
}
