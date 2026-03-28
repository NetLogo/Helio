export interface EmailServicePort {
  send(to: string, subject: string, body: string): Promise<void>;
}

export default function makeEmailService({
  logger,
}: {
  logger: { warn: (msg: string) => void };
}): EmailServicePort {
  return {
    async send(to: string, subject: string, _body: string): Promise<void> {
      logger.warn(`[EMAIL STUB] Would send to ${to}: ${subject}`);
    },
  };
}
