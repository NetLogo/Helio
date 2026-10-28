import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import { modelCommentNotificationCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';
import { EmailMode } from '#prisma/index';

export { EmailMode };

export type NotificationCategory = keyof typeof modelCommentNotificationCategories;

export const NOTIFICATION_CATEGORIES = Object.keys(
  modelCommentNotificationCategories,
) as ReadonlyArray<NotificationCategory>;

export const NOTIFICATION_TARGET_TYPES = ['model'] as const;

export type NotificationTargetType = (typeof NOTIFICATION_TARGET_TYPES)[number];

export type NotificationTargetRef = { type: NotificationTargetType; id: string };

// What the feed renders once a stored reference is resolved. Title and body are frozen
// at delivery time, but identity is read live, so a renamed model, a new avatar or a
// deleted account is reflected the next time the feed is opened.
export type NotificationSubject = { name: string | null; thumbnailUrl: string | null; url: string };

export type ResolvedNotificationSubjects = {
  actor: NotificationSubject | null;
  target: NotificationSubject | null;
};

export type NotificationChannels = {
  email: EmailMode;
  inApp: boolean;
};

export type NotificationCategoryInfo = {
  category: NotificationCategory;
  label: string;
  description: string;
  defaults: NotificationChannels;
};

export type NotificationCategoryDefinition = Omit<NotificationCategoryInfo, 'category'>;

export type NotificationFeedFilters = {
  categories: Array<NotificationCategory>;
  since?: Date;
  unreadOnly?: boolean;
};

export type EmailModeByCategory = Partial<Record<NotificationCategory, EmailMode>>;

export type DigestRow = {
  id: string;
  category: string;
  title: string;
  url: string;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: Date;
};

export type NotificationGroupActor = { userId: string; rowId: string };

export type NotificationGroup = {
  target: { type: string; id: string } | null;
  actors: Array<NotificationGroupActor>;
  rowIds: Array<string>;
  title: string;
  url: string;
};

export type DigestItem = { text: string; url: string };

export type Digest = { items: Array<DigestItem>; moreCount: number };

export type DigestWindow = { since: Date; until: Date };

export type DeliverableRecipient = UserEntity & { email: string };

export type NotificationRecipient = { id: string; email: string; name: string | null };

export type NotificationLinks = { unsubscribeUrl: string; preferencesUrl: string };

export type NotificationIntent = {
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
  // References, not URLs: the feed resolves them on read so identity stays current.
  actorUserId?: string;
  target?: NotificationTargetRef;
  buildEmail: (recipient: NotificationRecipient, links: NotificationLinks) => Promise<Mail.Options>;
};

export type Notifier = {
  eventTypes: ReadonlyArray<string>;
  resolve: (event: EventRecord) => Promise<Array<NotificationIntent>>;
};
