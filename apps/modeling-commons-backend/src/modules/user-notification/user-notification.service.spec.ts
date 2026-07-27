import { describe, it, expect, beforeEach } from 'vitest';
import makeUserNotificationService from '#src/modules/user-notification/user-notification.service.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import { UnknownCategoryError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/database/notification-preference.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';

function makeRecord(
  overrides: Partial<NotificationPreferenceRecord> = {},
): NotificationPreferenceRecord {
  return {
    id: 'pref-1',
    userId: 'user-1',
    category: 'comment.on_your_model',
    email: false,
    inApp: true,
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('userNotificationService', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const transactionManager = mockTransactionManager();
  const domain = userNotificationDomain();

  const service = makeUserNotificationService({
    transactionManager,
    notificationPreferenceRepository,
    userNotificationDomain: domain,
  } as never);

  beforeEach(() => {
    notificationPreferenceRepository.findAllByUser.mockReset();
    notificationPreferenceRepository.upsertTx.mockReset();
  });

  describe('updatePreferences', () => {
    it('rejects an unknown category and writes nothing', async () => {
      await expect(
        service.updatePreferences('user-1', [{ category: 'comment.mentions_you', email: false }]),
      ).rejects.toThrow(UnknownCategoryError);

      expect(notificationPreferenceRepository.findAllByUser).not.toHaveBeenCalled();
      expect(notificationPreferenceRepository.upsertTx).not.toHaveBeenCalled();
    });

    it('keeps the currently-resolved value for an omitted channel', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ email: false, inApp: true }),
      ]);

      await service.updatePreferences('user-1', [
        { category: 'comment.on_your_model', inApp: false },
      ]);

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: false,
          inApp: false,
        }),
      );
    });

    it('falls back to the catalog default for an omitted channel with no override', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);

      await service.updatePreferences('user-1', [
        { category: 'comment.on_your_model', email: false },
      ]);

      const defaults = domain.categories.find(
        (info) => info.category === 'comment.on_your_model',
      )!.defaults;

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: false,
          inApp: defaults.inApp,
        }),
      );
    });

    it('writes with the userId that was passed in, not any value from the input rows', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);

      await service.updatePreferences('caller-user', [
        { category: 'comment.on_your_model', email: true, inApp: true },
      ]);

      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledWith('caller-user');
      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'caller-user' }),
      );
    });
  });
});
