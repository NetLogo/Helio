import { vi } from 'vitest';
import type { ModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.port.ts';

export function mockModelAuthorRepository(): {
  [K in keyof ModelAuthorRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    findByCompositeKey: vi.fn(),
    findOwnerByModel: vi.fn(),
    findAllByModel: vi.fn(),
    findModelsByUser: vi.fn(),
    insertTx: vi.fn(),
    updateRoleTx: vi.fn(),
    deleteTx: vi.fn(),
  };
}
