import type { EmailQueue } from '#prisma/index';
import type Mail from 'nodemailer/lib/mailer/index.js';

export type EmailQueueRecord = Omit<EmailQueue, 'content'> & { content: Mail.Options };
