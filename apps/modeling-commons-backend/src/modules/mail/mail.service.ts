import transporter from '#src/lib/mail.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

export default function makeMailService({ logger }: Dependencies) {
  return {
    async sendMail(content: Mail) {
      transporter.sendMail(content, (error, info) => {
        if (error) {
          logger.error({ name: 'Mail Service', message: 'Failed to send email', error, info });
        } else {
          logger.info({ name: 'Mail Service', message: 'Email sent successfully', info });
        }
      });
    },
  };
}
