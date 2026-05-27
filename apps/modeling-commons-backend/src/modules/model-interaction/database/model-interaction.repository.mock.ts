import { vi } from 'vitest';
import type { ModelInteractionRepository } from '#src/modules/model-interaction/database/model-interaction.repository.port.ts';

export function mockModelInteractionRepository(): {
  [K in keyof ModelInteractionRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    hasRecentMatch: vi.fn(),
  };
}
