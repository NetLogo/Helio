import fp from 'fastify-plugin';
import { createTransport, type Transporter } from 'nodemailer';
import type { FastifyInstance } from 'fastify';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import env from '#src/config/env.ts';

class FastifyMailerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FastifyMailerError';
  }
}

function fastifyMailer(fastify: FastifyInstance) {
  const defaults: SMTPTransport.Options = {
    from: `${env.product.name} <${env.smtp.senderAddress}>`,
  };
  const transport: SMTPTransport.Options | undefined = {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
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

  if (fastify.mailer) {
    throw new FastifyMailerError('fastify-mailer has already been registered');
  } else {
    fastify.decorate('mailer', transporter);
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    mailer: Transporter;
  }
}

export default fp(fastifyMailer, {
  fastify: '>=2.0.0',
  name: 'fastify-mailer',
});
