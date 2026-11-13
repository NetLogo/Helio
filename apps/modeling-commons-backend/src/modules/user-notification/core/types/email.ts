import type Mail from 'nodemailer/lib/mailer/index.js';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';

export type Links = {
  unsubscribeUrl: string;
  oneClickUnsubscribeUrl: string;
  preferencesUrl: string;
};

export type Queued = {
  categories: ReadonlyArray<NotificationCategory>;
  render: (links: Links) => Promise<Mail.Options>;
};

export type Recipient = { id: string; email: string; name: string | null };

export type UserWithEmail = UserEntity & { email: string };
