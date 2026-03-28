import { vi } from 'vitest';
import type { ModelAdditionalFileRepository } from '#src/modules/model-additional-file/database/model-additional-file.repository.port.ts';

export function mockModelAdditionalFileRepository(): { [K in keyof ModelAdditionalFileRepository]: ReturnType<typeof vi.fn> } {
  return {
    insertTx: vi.fn(),
    deleteTx: vi.fn(),
    findOneById: vi.fn(),
    findByModel: vi.fn(),
  };
}
