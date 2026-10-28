import { vi } from 'vitest';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';

export function mockUserNotificationRepository(): {
  [K in keyof UserNotificationRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    findOneByDeliveryKey: vi.fn(),
    claimUnsent: vi.fn().mockResolvedValue([]),
    markSent: vi.fn().mockResolvedValue(undefined),
    releaseClaim: vi.fn().mockResolvedValue(undefined),
    findPendingForRecipient: vi.fn().mockResolvedValue([]),
    findDigestRecipients: vi.fn().mockResolvedValue([]),
    markRead: vi.fn(),
    findOneById: vi.fn(),
    findAllByRecipient: vi.fn(),
    countUnread: vi.fn(),
    deleteOrphaned: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(0),
  };
}
