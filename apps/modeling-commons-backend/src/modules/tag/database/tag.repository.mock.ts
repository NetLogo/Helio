import { vi } from 'vitest';
import type { TagRepository } from '#src/modules/tag/database/tag.repository.port.ts';

export function mockTagRepository(): { [K in keyof TagRepository]: ReturnType<typeof vi.fn> } {
  return {
    insert: vi.fn(),
    findOneById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByNameInsensitive: vi.fn(),
    findByPrefix: vi.fn(),
    upsertByName: vi.fn(),
  };
}
