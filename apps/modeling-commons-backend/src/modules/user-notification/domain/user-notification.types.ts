import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

export type NotificationCategory =
  | 'comment.on_your_model'
  | 'comment.reply_to_you'
  | 'general.daily_digest';

export type NotificationChannels = {
  email: boolean;
  inApp: boolean;
};

export type NotificationCategoryInfo = {
  category: NotificationCategory;
  label: string;
  description: string;
  defaults: NotificationChannels;
};

export type NotificationRecipient = { id: string; email: string; name: string | null };

export type NotificationLinks = { unsubscribeUrl: string; preferencesUrl: string };

export type NotificationIntent = {
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
  buildEmail: (
    recipient: NotificationRecipient,
    links: NotificationLinks,
  ) => Promise<Mail.Options>;
};

export type Notifier = {
  eventTypes: ReadonlyArray<string>;
  resolve: (event: EventRecord) => Promise<Array<NotificationIntent>>;
};

export type EventSubscriber = {
  handles: (eventType: string) => boolean;
  handleEvent: (event: EventRecord) => Promise<void>;
};
