import env from '#src/config/env.ts';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

class FastifyMailerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FastifyMailerError';
  }
}

const defaults: SMTPTransport.Options = {
  from: `${env.product.name} <${env.smtp.senderAddress}>`,
};
const transport: SMTPTransport.Options | undefined = {
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
  secure: true,
  requireTLS: true,
};

if (!transport) {
  throw new FastifyMailerError(
    'You must provide a valid transport configuration object, connection url or a transport plugin instance',
  );
}

let transporter: Transporter;

try {
  if (!defaults) {
    transporter = createTransport(transport);
  } else {
    transporter = createTransport(transport, defaults);
  }
} catch (error) {
  throw new FastifyMailerError(`Failed to create transporter: ${(error as Error).message}`);
}

export default transporter;
export { default as mailDomain, type MailContent } from '#src/modules/mail/domain/mail.domain.ts';
