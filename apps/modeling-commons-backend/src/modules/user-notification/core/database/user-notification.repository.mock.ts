import { vi } from 'vitest';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import { mockPort, type MockedPort } from '#src/shared/test/mock-port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { stageCommitEffect } from '#src/shared/test/mock-transaction-manager.ts';

export function mockUserNotificationRepository(): MockedPort<UserNotificationRepositoryPort> {
  return mockPort<UserNotificationRepositoryPort>({
    markEmailSentTx: vi.fn().mockResolvedValue([]),
    findPendingForRecipient: vi.fn().mockResolvedValue([]),
    findDigestRecipients: vi.fn().mockResolvedValue([]),
    redactPayloads: vi.fn().mockResolvedValue(0),
    deleteOrphaned: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(0),
  });
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

export function fakeClaimDigest(claimedDays: Set<string>) {
  return async (recipientId: string, day: Date, ctx: TransactionContext): Promise<boolean> => {
    const key = `${recipientId}:${day.toISOString()}`;
    if (claimedDays.has(key)) return false;
    stageCommitEffect(ctx, () => claimedDays.add(key));
    return true;
  };
}
