import { vi } from 'vitest';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';

export function mockUserNotificationRepository(): {
  [K in keyof UserNotificationRepositoryPort]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    markEmailSent: vi.fn(),
  };
}
