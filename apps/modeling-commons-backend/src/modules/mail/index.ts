import type mailDomain from './domain/mail.domain.ts';

declare global {
  export interface Dependencies {
    mailService: ReturnType<typeof import('./mail.service.ts').default>;
    mailDomain: ReturnType<typeof mailDomain>;
  }
}
