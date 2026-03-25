import { vi } from 'vitest';
import type { FileRepository } from '#src/modules/file/database/file.repository.port.ts';

export function mockFileRepository(): { [K in keyof FileRepository]: ReturnType<typeof vi.fn> } {
  return {
    insert: vi.fn(),
    findOneById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insertTx: vi.fn(),
    findMetadataById: vi.fn(),
  };
}
