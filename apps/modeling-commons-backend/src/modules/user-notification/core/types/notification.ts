import type {
  NotificationCategory,
  NotificationPayloads,
} from '#src/modules/notification-catalog.ts';

export const NOTIFICATION_TARGET_TYPES = ['model'] as const;

export type NotificationTargetType = (typeof NOTIFICATION_TARGET_TYPES)[number];

export const MODEL_TARGET_TYPE: NotificationTargetType = 'model';

export type NotificationTargetRef = { type: NotificationTargetType; id: string };

export type NotificationLinkPreview = {
  name: string | null;
  thumbnailUrl: string | null;
  url: string;
};

export type NotificationSubjects = {
  actor: NotificationLinkPreview | null;
  target: NotificationLinkPreview | null;
};

export type SubjectsByNotificationId = {
  of: (notificationId: string) => NotificationSubjects;
};

type NotificationFields = {
  id: string;
  url: string;
  actorId: string | null;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  createdAt: Date;
};

type NewNotificationFields = {
  recipientId: string;
  url: string;
  // References, not URLs: the feed resolves them on read so identity stays current.
  actorId?: string;
  target?: NotificationTargetRef;
};

export type Notification = {
  [Category in NotificationCategory]: NotificationFields & {
    category: Category;
    payload: NotificationPayloads[Category];
  };
}[NotificationCategory];

export type NewNotificationPayload = {
  [Category in NotificationCategory]: NewNotificationFields & {
    category: Category;
    payload: NotificationPayloads[Category];
  };
}[NotificationCategory];

export type NotificationRedaction = {
  match: { payloadKey: string; value: string };
  payloadFields: Array<string>;
};
