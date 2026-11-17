import links from '#src/config/links.ts';
import {
  MODEL_TARGET_TYPE,
  type Notification,
  type NotificationLinkPreview,
  type NotificationSubjects,
  type SubjectsByNotificationId,
} from '#src/modules/user-notification/core/types/index.ts';
import type { UserAvatarRecord } from '#src/modules/user/database/user.repository.port.ts';
import { collectUniqueDefined } from '#src/shared/utils/collections.ts';

type NotificationSubjectRefs = Pick<Notification, 'id' | 'actorId' | 'targetType' | 'targetId'>;

export function getTargetModelId(notification: NotificationSubjectRefs): string | null {
  return notification.targetType === MODEL_TARGET_TYPE ? notification.targetId : null;
}

export function collectActorIds(
  notifications: ReadonlyArray<NotificationSubjectRefs>,
): Array<string> {
  return collectUniqueDefined(notifications.map((notification) => notification.actorId));
}

export function collectModelIds(
  notifications: ReadonlyArray<NotificationSubjectRefs>,
): Array<string> {
  return collectUniqueDefined(notifications.map(getTargetModelId));
}

export function toActorPreview(avatar: UserAvatarRecord): NotificationLinkPreview {
  return { name: avatar.name, thumbnailUrl: avatar.image, url: links.user(avatar.id) };
}

export function makeSubjectsByNotificationId(
  entries: Iterable<readonly [string, NotificationSubjects]>,
): SubjectsByNotificationId {
  const byId = new Map(entries);
  return {
    of(notificationId) {
      const subjects = byId.get(notificationId);
      if (!subjects) {
        throw new Error(`No subjects were resolved for notification ${notificationId}`);
      }
      return subjects;
    },
  };
}
