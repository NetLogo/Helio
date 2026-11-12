import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';
import type * as Digest from './digest.ts';
import type * as Email from './email.ts';
import type * as Feed from './feed.ts';
import type {
  NewNotificationPayload,
  Notification,
  NotificationRedaction,
  NotificationSubjects,
  SubjectsByNotificationId,
} from './notification.ts';

export type NotificationProducer = {
  buildNotifications: (event: EventRecord) => Promise<Array<NewNotificationPayload>>;
  findRedaction: (event: EventRecord) => NotificationRedaction | undefined;
  describeFeedItem: (notification: Notification, subjects: NotificationSubjects) => Feed.ItemText;
  renderEmail: (
    notification: Notification,
    recipient: Email.Recipient,
    subjects: NotificationSubjects,
    links: Email.Links,
  ) => Promise<Mail.Options>;
  describeDigestItem: (
    group: Digest.Group,
    subjects: SubjectsByNotificationId,
  ) => Digest.Item | undefined;
};
