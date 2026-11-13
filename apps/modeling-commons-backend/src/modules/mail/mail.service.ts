import workersConfig from '#src/config/workers.ts';
import transporter from '#src/lib/mail.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { SentMessageInfo } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';

const { queueName } = workersConfig.sendEmail;

export default function makeMailService({ logger, jobQueue }: Dependencies) {
  return {
    async enqueue(content: Mail.Options, ctx: TransactionContext): Promise<void> {
      await jobQueue.sendTx(ctx, queueName, content);
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
