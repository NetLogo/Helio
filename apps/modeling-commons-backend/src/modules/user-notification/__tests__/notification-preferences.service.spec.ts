import { describe, it, expect, beforeEach } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import { getEmailLinks } from '#src/modules/user-notification/email/email-links.domain.ts';
import { InvalidUnsubscribeTokenError } from '#src/modules/user-notification/core/notification.errors.ts';
import {
  makePreferenceRecord,
  mockNotificationPreferenceRepository,
} from '#src/modules/user-notification/preferences/database/notification-preference.repository.mock.ts';
import makeNotificationPreferencesService from '#src/modules/user-notification/preferences/notification-preferences.service.ts';
import { categories } from '#src/modules/user-notification/preferences/preferences.domain.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';

describe('notificationPreferencesService', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const transactionManager = mockTransactionManager();

  const service = makeNotificationPreferencesService({
    transactionManager,
    notificationPreferenceRepository,
    userNotificationMapper: userNotificationMapper(),
  } as never);

  async function updatePreferences(
    userId: string,
    preferences: Parameters<typeof service.updatePreferencesTx>[2],
  ) {
    return transactionManager.run(async (ctx) =>
      service.updatePreferencesTx(ctx, userId, preferences),
    );
  }

  beforeEach(() => {
    notificationPreferenceRepository.findAllByUser.mockReset();
    notificationPreferenceRepository.findAllByUserTx.mockReset();
    notificationPreferenceRepository.upsertTx.mockReset();
  });

  describe('updatePreferencesTx', () => {
    it('keeps the currently-resolved value for an omitted channel', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([
        makePreferenceRecord({ email: 'off', inApp: true }),
      ]);

      await updatePreferences('user-1', [{ category: 'comment.on_your_model', inApp: false }]);

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: 'off',
          inApp: false,
        }),
      );
    });

    it('falls back to the catalog default for an omitted channel with no override', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([]);

      await updatePreferences('user-1', [{ category: 'comment.on_your_model', email: 'off' }]);

      const defaults = categories.find(
        (info) => info.category === 'comment.on_your_model',
      )!.defaults;

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: 'off',
          inApp: defaults.inApp,
        }),
      );
    });

    it('returns the categories whose email was switched on', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.on_your_model', email: 'off' }),
      ]);

      const switchedOn = await updatePreferences('user-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
        { category: 'comment.reply_to_you', email: 'off' },
      ]);

      expect(switchedOn).toEqual(['comment.on_your_model']);
    });

    it('writes with the userId that was passed in, not any value from the input notifications', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([]);

      await updatePreferences('caller-user', [
        { category: 'comment.on_your_model', email: 'immediate', inApp: true },
      ]);

      expect(notificationPreferenceRepository.findAllByUserTx).toHaveBeenCalledWith(
        expect.anything(),
        'caller-user',
      );
      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'caller-user' }),
      );
    });
  });

  describe('unsubscribe', () => {
    function readToken(url: string): string {
      return new URL(url).searchParams.get('token') ?? '';
    }

    it('turns email off for exactly the signed categories of the signed user', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([
        makePreferenceRecord({ userId: 'user-1', category: 'comment.on_your_model', inApp: false }),
      ]);
      const token = readToken(
        (await getEmailLinks('user-1', ['comment.on_your_model'])).unsubscribeUrl,
      );

      await service.unsubscribe(token);

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledTimes(1);
      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        category: 'comment.on_your_model',
        email: 'off',
        inApp: false,
      });
    });

    it('refuses a tampered token and writes nothing', async () => {
      const token = readToken(
        (await getEmailLinks('user-1', ['comment.on_your_model'])).unsubscribeUrl,
      );
      const [, payload] = token.split('.');
      const forged = Buffer.from(
        JSON.stringify({
          sub: 'user-2',
          aud: notificationsConfig.unsubscribeTokenPurpose,
          categories: ['comment.on_your_model'],
        }),
      ).toString('base64url');

      await expect(service.unsubscribe(token.replace(payload!, forged))).rejects.toBeInstanceOf(
        InvalidUnsubscribeTokenError,
      );
      await expect(service.unsubscribe('not-a-token')).rejects.toBeInstanceOf(
        InvalidUnsubscribeTokenError,
      );
      expect(notificationPreferenceRepository.upsertTx).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    function expectedDefaults() {
      return categories.map((info) => ({
        category: info.category,
        label: info.label,
        description: info.description,
        email: info.defaults.email,
        inApp: info.defaults.inApp,
      }));
    }

    it('returns every catalog category at its defaults when the user has no overrides', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);

      const result = await service.getPreferences('user-1');

      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ categories: expectedDefaults() });
    });

    it('applies a stored override to its category and leaves the rest at defaults', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.reply_to_you', email: 'off', inApp: true }),
      ]);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual({
        categories: expectedDefaults().map((preference) =>
          preference.category === 'comment.reply_to_you'
            ? { ...preference, email: 'off', inApp: true }
            : preference,
        ),
      });
    });

    it('ignores an override notification for a category missing from the catalog', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.mentions_you', email: 'off', inApp: false }),
      ]);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual({ categories: expectedDefaults() });
    });
  });
});
