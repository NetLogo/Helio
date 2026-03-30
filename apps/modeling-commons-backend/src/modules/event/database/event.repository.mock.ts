import { vi } from 'vitest';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';

export function mockEventRepository(): {
  [K in keyof EventRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    insert: vi.fn(),
    findUnprocessed: vi.fn(),
    markProcessed: vi.fn(),
    search: vi.fn(),
  };
}
