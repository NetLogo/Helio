import { vi } from 'vitest';
import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/database/notification-preference.repository.port.ts';

export function mockNotificationPreferenceRepository(): {
  [K in keyof NotificationPreferenceRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    findAllByUser: vi.fn(),
    upsertTx: vi.fn(),
  };
}
