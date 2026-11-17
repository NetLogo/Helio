import { vi } from 'vitest';
import { mockPort, type MockedPort } from '#src/shared/test/mock-port.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/preferences/database/notification-preference.record.ts';
import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/preferences/database/notification-preference.repository.port.ts';

export function mockNotificationPreferenceRepository(): MockedPort<NotificationPreferenceRepositoryPort> {
  return mockPort<NotificationPreferenceRepositoryPort>({
    findAllByUser: vi.fn().mockResolvedValue([]),
    findAllByUserTx: vi.fn().mockResolvedValue([]),
    upsertTx: vi.fn().mockResolvedValue(undefined),
  });
}

export function makePreferenceRecord(
  overrides: Partial<NotificationPreferenceRecord> = {},
): NotificationPreferenceRecord {
  return {
    id: 'pref-1',
    userId: 'user-1',
    category: 'comment.on_your_model',
    email: 'off',
    inApp: true,
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
