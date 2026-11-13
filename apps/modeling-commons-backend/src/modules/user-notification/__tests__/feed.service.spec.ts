import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationNotFoundError } from '#src/modules/user-notification/core/notification.errors.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/core/database/user-notification.repository.mock.ts';
import { makeInsertedNotification } from '#src/modules/user-notification/__tests__/notification.mock.ts';
import makeFeedService from '#src/modules/user-notification/feed/feed.service.ts';

describe('feedService markRead', () => {
  const userNotificationRepository = mockUserNotificationRepository();

  const service = makeFeedService({ userNotificationRepository } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stamps readAt on a notification the caller owns', async () => {
    userNotificationRepository.findOneById.mockResolvedValue(makeInsertedNotification());

    await service.markRead('recipient-1', 'notification-1');

    expect(userNotificationRepository.markRead).toHaveBeenCalledWith(
      'notification-1',
      expect.any(Date),
    );
  });

  it('leaves an already-read notification untouched', async () => {
    userNotificationRepository.findOneById.mockResolvedValue(
      makeInsertedNotification({ readAt: new Date('2026-01-02') }),
    );

    await service.markRead('recipient-1', 'notification-1');

    expect(userNotificationRepository.markRead).not.toHaveBeenCalled();
  });

  it('rejects a notification that does not exist', async () => {
    userNotificationRepository.findOneById.mockResolvedValue(undefined);

    await expect(service.markRead('recipient-1', 'missing')).rejects.toThrow(
      NotificationNotFoundError,
    );
    expect(userNotificationRepository.markRead).not.toHaveBeenCalled();
  });

  it("refuses to read another user's notification and does not leak that it exists", async () => {
    userNotificationRepository.findOneById.mockResolvedValue(makeInsertedNotification());

    await expect(service.markRead('someone-else', 'notification-1')).rejects.toThrow(
      NotificationNotFoundError,
    );
    expect(userNotificationRepository.markRead).not.toHaveBeenCalled();
  });
});
