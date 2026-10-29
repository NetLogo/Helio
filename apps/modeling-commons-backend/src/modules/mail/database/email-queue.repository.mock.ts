import { vi } from 'vitest';
import type { EmailQueueRepositoryPort } from '#src/modules/mail/database/email-queue.repository.port.ts';

export function mockEmailQueueRepository(): {
  [K in keyof EmailQueueRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    findUnsent: vi.fn().mockResolvedValue([]),
    markSent: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    deleteSentBefore: vi.fn().mockResolvedValue(0),
    deleteFailedBefore: vi.fn().mockResolvedValue(0),
  };
}
