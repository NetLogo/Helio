import type { EmailQueueRepositoryPort } from '#src/modules/mail/database/email-queue.repository.port.ts';
import type mailDomain from './domain/mail.domain.ts';

declare global {
  export interface Dependencies {
    mailService: ReturnType<typeof import('./mail.service.ts').default>;
    mailDomain: ReturnType<typeof mailDomain>;
    emailQueueRepository: EmailQueueRepositoryPort;
  }
}
