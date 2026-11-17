import notificationsConfig from '#src/config/notifications.ts';
import { subtractMs } from '#src/shared/utils/dates.ts';
import type {
  NotificationCategory,
  RegisteredNotificationModule,
} from '#src/modules/notification-catalog.ts';
import type {
  Digest,
  Notification,
  SubjectsByNotificationId,
} from '#src/modules/user-notification/core/types/index.ts';

type GroupWithModule = { module: RegisteredNotificationModule; group: Digest.Group };

type ModuleByCategory = Readonly<Record<NotificationCategory, RegisteredNotificationModule>>;

export function getDigestWindow(now: Date): Digest.Window {
  return {
    since: subtractMs(now, notificationsConfig.windowMs),
    until: subtractMs(now, notificationsConfig.minAgeMs),
  };
}

export function getDigestDay(window: Digest.Window): Date {
  return new Date(window.until.toISOString().slice(0, 10));
}

export function getPendingWindow(now: Date): Digest.Window {
  return { since: subtractMs(now, notificationsConfig.windowMs), until: now };
}

function compareNewestFirst(a: Notification, b: Notification): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function getTarget(notification: Notification): Digest.Group['target'] {
  return notification.targetType && notification.targetId
    ? { type: notification.targetType, id: notification.targetId }
    : null;
}

function getGroupKey(notification: Notification, producerName: string): string {
  const target = getTarget(notification);
  return target ? `${producerName}:${target.type}:${target.id}` : `notification:${notification.id}`;
}

export function groupNotifications(
  notifications: ReadonlyArray<Notification>,
  moduleByCategory: ModuleByCategory,
): Array<GroupWithModule> {
  const groups = new Map<string, GroupWithModule>();
  for (const notification of [...notifications].sort(compareNewestFirst)) {
    const module = moduleByCategory[notification.category];

    const key = getGroupKey(notification, module.name);
    const groupWithModule = groups.get(key) ?? {
      module,
      group: { target: getTarget(notification), actors: [], notifications: [] },
    };
    groupWithModule.group.notifications.push(notification);
    if (
      notification.actorId &&
      !groupWithModule.group.actors.some((actor) => actor.userId === notification.actorId)
    ) {
      groupWithModule.group.actors.push({
        userId: notification.actorId,
        notificationId: notification.id,
      });
    }
    groups.set(key, groupWithModule);
  }
  return [...groups.values()];
}

export function buildDigest(
  notifications: ReadonlyArray<Notification>,
  subjects: SubjectsByNotificationId,
  moduleByCategory: ModuleByCategory,
): Digest.Summary {
  const items = groupNotifications(notifications, moduleByCategory)
    .map(({ module, group }) => module.producer.describeDigestItem(group, subjects))
    .filter((item): item is Digest.Item => item !== undefined);
  const maxItems = notificationsConfig.maxDigestItems;
  return { items: items.slice(0, maxItems), moreCount: Math.max(0, items.length - maxItems) };
}
