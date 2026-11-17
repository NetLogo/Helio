import { vi } from 'vitest';
import type { RegisteredNotificationModule } from '#src/modules/notification-catalog.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { mockRegisteredNotificationModule } from '#src/modules/user-notification/__tests__/producer.mock.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';
import type {
  Email,
  NewNotificationPayload,
} from '#src/modules/user-notification/core/types/index.ts';

export function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'event-1',
    type: 'model_comment.created',
    actorId: 'actor-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: { commentId: 'comment-1', parentId: null },
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as EventRecord;
}

export function makeNewNotification(
  overrides: Partial<NewNotificationPayload> = {},
): NewNotificationPayload {
  return {
    recipientId: 'recipient-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: { commentId: 'comment-1', excerpt: '' },
    ...overrides,
  };
}

export function makeProducer(
  newNotifications: Array<NewNotificationPayload>,
): RegisteredNotificationModule {
  return mockRegisteredNotificationModule({
    buildNotifications: vi.fn().mockResolvedValue(newNotifications),
    renderEmail: vi.fn().mockImplementation(async (_row, recipient: Email.Recipient) => ({
      to: recipient.email,
      subject: 'New comment',
    })),
  });
}

export function makeUserRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'recipient-1',
    name: 'Recipient',
    email: 'recipient@example.test',
    deletedAt: null,
    banned: null,
    ...overrides,
  };
}

export function makeInsertedNotification(
  overrides: Partial<UserNotificationRecord> = {},
): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: 'recipient-1',
    eventId: 'event-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: { commentId: 'comment-1', excerpt: '' },
    actorId: null,
    targetType: null,
    targetId: null,
    emailSentAt: null,
    readAt: null,
    inAppSuppressed: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as UserNotificationRecord;
}
