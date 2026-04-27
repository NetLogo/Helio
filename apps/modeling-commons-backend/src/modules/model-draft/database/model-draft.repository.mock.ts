import { vi } from 'vitest';
import type { ModelDraftRepository } from '#src/modules/model-draft/database/model-draft.repository.port.ts';

export function mockModelDraftRepository(): {
  [K in keyof ModelDraftRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    findById: vi.fn(),
    listByUser: vi.fn(),
    insertTx: vi.fn(),
    updateDataTx: vi.fn(),
    hardDeleteTx: vi.fn(),
    deleteStaleBefore: vi.fn(),
  };
}
