import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { InsertUserNotificationParams } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import type {
  Category,
  NewNotificationPayload,
} from '#src/modules/user-notification/core/types/index.ts';

export function buildNewNotification(
  event: EventRecord,
  recipientId: string,
  newNotification: NewNotificationPayload,
  channels: Category.ChannelPreferences,
): InsertUserNotificationParams {
  return {
    recipientId,
    eventId: event.id,
    category: newNotification.category,
    url: newNotification.url,
    payload: newNotification.payload,
    actorId: newNotification.actorId ?? null,
    targetType: newNotification.target?.type ?? null,
    targetId: newNotification.target?.id ?? null,
    inAppSuppressed: !channels.inApp,
  };
}

export function listInAppRecipientIds(
  notifications: ReadonlyArray<{ recipientId: string; inAppSuppressed: boolean }>,
): Array<string> {
  return [
    ...new Set(
      notifications
        .filter((notification) => !notification.inAppSuppressed)
        .map((notification) => notification.recipientId),
    ),
  ];
}
