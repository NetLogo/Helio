import { describe, it, expect } from 'vitest';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { NewNotificationPayload } from '#src/modules/user-notification/core/types/index.ts';
import {
  buildNewNotification,
  listInAppRecipientIds,
} from '#src/modules/user-notification/delivery/delivery.domain.ts';

function makeEvent(): EventRecord {
  return {
    id: 'event-1',
    type: 'model_comment.created',
    actorId: 'actor-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: { commentId: 'comment-1', parentId: null },
    createdAt: new Date('2026-01-01'),
  };
}

function makeNewNotification(
  overrides: Partial<NewNotificationPayload> = {},
): NewNotificationPayload {
  return {
    recipientId: 'recipient-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: { commentId: 'comment-1', excerpt: 'Nice model' },
    ...overrides,
  };
}

describe('delivery domain', () => {
  describe('listInAppRecipientIds', () => {
    it('lists each recipient once whose notification shows in the feed', () => {
      const ids = listInAppRecipientIds([
        { recipientId: 'a', inAppSuppressed: false },
        { recipientId: 'b', inAppSuppressed: true },
        { recipientId: 'a', inAppSuppressed: false },
        { recipientId: 'c', inAppSuppressed: false },
      ]);

      expect(ids).toEqual(['a', 'c']);
    });

    it('lists nobody when every notification is suppressed', () => {
      expect(listInAppRecipientIds([{ recipientId: 'a', inAppSuppressed: true }])).toEqual([]);
    });
  });

  describe('buildNewNotification', () => {
    it('maps an intent with an actor and a target to their reference columns', () => {
      const notification = buildNewNotification(
        makeEvent(),
        'recipient-1',
        makeNewNotification({ actorId: 'actor-1', target: { type: 'model', id: 'model-1' } }),
        { email: 'immediate', inApp: true },
      );

      expect(notification).toEqual({
        recipientId: 'recipient-1',
        eventId: 'event-1',
        category: 'comment.on_your_model',
        url: 'https://example.test/models/model-1',
        payload: { commentId: 'comment-1', excerpt: 'Nice model' },
        actorId: 'actor-1',
        targetType: 'model',
        targetId: 'model-1',
        inAppSuppressed: false,
      });
    });

    it('writes null reference columns for an intent with neither actor nor target', () => {
      const notification = buildNewNotification(makeEvent(), 'recipient-1', makeNewNotification(), {
        email: 'immediate',
        inApp: true,
      });

      expect(notification).toMatchObject({ actorId: null, targetType: null, targetId: null });
    });
  });
});
