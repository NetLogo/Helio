import { vi } from 'vitest';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { stageCommitEffect } from '#src/shared/test/mock-transaction-manager.ts';

export function mockUserNotificationRepository(): {
  [K in keyof UserNotificationRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    markEmailSentTx: vi.fn().mockResolvedValue([]),
    findPendingForRecipient: vi.fn().mockResolvedValue([]),
    findDigestRecipients: vi.fn().mockResolvedValue([]),
    markRead: vi.fn(),
    redactPayloads: vi.fn().mockResolvedValue(0),
    findOneById: vi.fn(),
    findAllByRecipient: vi.fn(),
    countUnread: vi.fn(),
    deleteOrphaned: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(0),
  };
}

export function fakeMarkEmailSent(sentIds: Set<string>) {
  return async (ids: Array<string>, _at: Date, ctx: TransactionContext): Promise<Array<string>> => {
    const marked = ids.filter((id) => !sentIds.has(id));
    stageCommitEffect(ctx, () => {
      for (const id of marked) sentIds.add(id);
    });
    return marked;
  };
}
