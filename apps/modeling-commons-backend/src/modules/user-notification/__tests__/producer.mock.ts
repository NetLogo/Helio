import { vi } from 'vitest';
import {
  notificationCategoryCatalog,
  type RegisteredNotificationModule,
} from '#src/modules/notification-catalog.ts';
import type {
  Digest,
  NotificationProducer,
  SubjectsByNotificationId,
} from '#src/modules/user-notification/core/types/index.ts';

export function mockNotificationProducer(
  overrides: Partial<NotificationProducer> = {},
): NotificationProducer {
  return {
    buildNotifications: vi.fn().mockResolvedValue([]),
    findRedaction: vi.fn().mockReturnValue(undefined),
    describeFeedItem: vi.fn().mockReturnValue({ title: '', body: '' }),
    renderEmail: vi.fn().mockResolvedValue({}),
    describeDigestItem: vi.fn().mockReturnValue(undefined),
    ...overrides,
  };
}

export function mockRegisteredNotificationModule(
  overrides: Partial<NotificationProducer> = {},
  module: Partial<Omit<RegisteredNotificationModule, 'producer'>> = {},
): RegisteredNotificationModule {
  return {
    name: 'catalog',
    eventTypes: ['model_comment.created'],
    categories: notificationCategoryCatalog,
    ...module,
    producer: mockNotificationProducer(overrides),
  };
}

export function describeGroupByTarget(group: Digest.Group, subjects: SubjectsByNotificationId) {
  if (!group.target) {
    return {
      text: group.notifications.map((notification) => notification.id).join(','),
      url: 'https://example.test',
    };
  }
  const target = subjects.of(group.notifications[0]!.id)?.target;
  return target?.name
    ? { text: `${group.notifications.length} on ${target.name}`, url: target.url }
    : undefined;
}
