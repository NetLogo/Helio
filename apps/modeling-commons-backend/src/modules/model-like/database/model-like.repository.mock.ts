import { vi } from 'vitest';
import type { ModelLikeRepository } from '#src/modules/model-like/database/model-like.repository.port.ts';

export function mockModelLikeRepository(): {
  [K in keyof ModelLikeRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    upsertTx: vi.fn(),
    deleteTx: vi.fn(),
    countByModel: vi.fn(),
    existsFor: vi.fn(),
    countsForModels: vi.fn(),
    likedModelIdsForUser: vi.fn(),
  };
}
