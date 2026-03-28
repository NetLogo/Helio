import { vi } from 'vitest';
import type { ModelVersionTagRepository } from '#src/modules/model-version-tag/database/model-version-tag.repository.port.ts';

export function mockModelVersionTagRepository(): { [K in keyof ModelVersionTagRepository]: ReturnType<typeof vi.fn> } {
  return {
    insertTx: vi.fn(),
    deleteTx: vi.fn(),
    findByVersionId: vi.fn(),
    exists: vi.fn(),
  };
}
