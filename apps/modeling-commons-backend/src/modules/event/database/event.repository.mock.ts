import { vi } from 'vitest';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';

export function mockEventRepository(): {
  [K in keyof EventRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    findOneById: vi.fn(),
    search: vi.fn(),
  };
}
