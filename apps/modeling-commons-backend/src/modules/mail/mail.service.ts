import transporter from '#src/lib/mail.ts';
import type { SentMessageInfo } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';

export default function makeMailService({ logger }: Dependencies) {
  return {
    sendMail(content: Mail.Options) {
      transporter.sendMail(content, (error, info) => {
        if (error) {
          logger.error({ name: 'Mail Service', message: 'Failed to send email', error, info });
        } else {
          logger.info({ name: 'Mail Service', message: 'Email sent successfully', info });
        }
      });
    },

    // Do not await this call in a request handler to prevent
    // blocking the response/time attacks.
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
