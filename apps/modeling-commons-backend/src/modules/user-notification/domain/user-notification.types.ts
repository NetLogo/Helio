import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import type { NotificationCategory } from '#src/modules/notification-producers.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';
import { EmailMode } from '#prisma/index';
import type { Prisma } from '#prisma/index';

export { EmailMode };

export type { NotificationCategory };

export const NOTIFICATION_TARGET_TYPES = ['model'] as const;

export type NotificationTargetType = (typeof NOTIFICATION_TARGET_TYPES)[number];

export type NotificationTargetRef = { type: NotificationTargetType; id: string };

// What the feed renders once a stored reference is resolved. Identity is read live, so a
// renamed model, a new avatar or a deleted account is reflected the next time the feed is opened.
export type NotificationPreview = { name: string | null; thumbnailUrl: string | null; url: string };

export type NotificationPreviews = {
  actor: NotificationPreview | null;
  target: NotificationPreview | null;
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

export type NotificationRow = {
  id: string;
  category: string;
  url: string;
  payload: Prisma.JsonValue;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: Date;
};

export type NotificationGroupActor = { userId: string; rowId: string };

export type NotificationGroup = {
  target: { type: string; id: string } | null;
  actors: Array<NotificationGroupActor>;
  rows: Array<NotificationRow>;
};

export type NotificationDescription = { title: string; body: string };

export type DigestItem = { text: string; url: string };

export type Digest = { items: Array<DigestItem>; moreCount: number };

export type DigestWindow = { since: Date; until: Date };

export type DeliverableRecipient = UserEntity & { email: string };

export type NotificationRecipient = { id: string; email: string; name: string | null };

export type NotificationLinks = { unsubscribeUrl: string; preferencesUrl: string };

export type NotificationRowFacts = {
  recipientUserId: string;
  category: NotificationCategory;
  url: string;
  payload: Prisma.InputJsonObject;
  // References, not URLs: the feed resolves them on read so identity stays current.
  actorUserId?: string;
  target?: NotificationTargetRef;
};

export type UserNotificationCreatedJobData = { recipientIds: Array<string> };

export type NotificationProducer = {
  name: string;
  eventTypes: ReadonlyArray<string>;
  categories: Readonly<Partial<Record<NotificationCategory, NotificationCategoryDefinition>>>;
  resolve: (event: EventRecord) => Promise<Array<NotificationRowFacts>>;
  describeRow: (row: NotificationRow, preview: NotificationPreviews) => NotificationDescription;
  renderEmail: (
    row: NotificationRow,
    recipient: NotificationRecipient,
    preview: NotificationPreviews,
    links: NotificationLinks,
  ) => Promise<Mail.Options>;
  describeGroup: (
    group: NotificationGroup,
    previews: ReadonlyMap<string, NotificationPreviews>,
  ) => DigestItem | undefined;
};
