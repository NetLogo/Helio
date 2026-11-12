import type { EmailMode } from '#prisma/index';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import {
  resolveChannelPreferences,
  resolvePreferencesByCategory,
} from '#src/modules/user-notification/core/channel-preferences.domain.ts';
import { InvalidUnsubscribeTokenError } from '#src/modules/user-notification/core/notification.errors.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { Category } from '#src/modules/user-notification/core/types/index.ts';
import { readUnsubscribeToken } from '#src/modules/user-notification/core/unsubscribe-token.domain.ts';
import type { NotificationPreferenceResponseDto } from '#src/modules/user-notification/preferences/dtos/notification-preference.response.dto.ts';
import {
  categories,
  listCategoriesSwitchedOn,
} from '#src/modules/user-notification/preferences/preferences.domain.ts';

export type UpdatePreferenceInput = {
  category: NotificationCategory;
  email?: EmailMode;
  inApp?: boolean;
};

export default function makeNotificationPreferencesService({
  transactionManager,
  notificationPreferenceRepository,
  userNotificationMapper,
}: Dependencies) {
  async function updatePreferencesTx(
    ctx: TransactionContext,
    userId: string,
    preferences: Array<UpdatePreferenceInput>,
  ): Promise<Array<NotificationCategory>> {
    const existing = await notificationPreferenceRepository.findAllByUserTx(ctx, userId);
    const existingByCategory = new Map(existing.map((override) => [override.category, override]));
    const previousModes: Category.EmailModeByCategory = {};
    const nextModes: Category.EmailModeByCategory = {};

    for (const preference of preferences) {
      const resolved = resolveChannelPreferences(
        preference.category,
        existingByCategory.get(preference.category),
      );
      const email = preference.email ?? resolved.email;

      await notificationPreferenceRepository.upsertTx(ctx, {
        userId,
        category: preference.category,
        email,
        inApp: preference.inApp ?? resolved.inApp,
      });
      previousModes[preference.category] = resolved.email;
      nextModes[preference.category] = email;
    }

    return listCategoriesSwitchedOn(previousModes, nextModes);
  }

  return {
    async getPreferences(userId: string): Promise<NotificationPreferenceResponseDto> {
      const overrides = await notificationPreferenceRepository.findAllByUser(userId);
      const preferencesByCategory = resolvePreferencesByCategory(overrides);

      return {
        categories: categories.map((info) =>
          userNotificationMapper.toCategoryPreference(info, preferencesByCategory[info.category]),
        ),
      };
    },

    updatePreferencesTx,

    async unsubscribe(token: string): Promise<void> {
      const claims = await readUnsubscribeToken(token);
      if (!claims) throw new InvalidUnsubscribeTokenError();

      await transactionManager.run(async (ctx) =>
        updatePreferencesTx(
          ctx,
          claims.userId,
          claims.categories.map((category) => ({ category, email: 'off' })),
        ),
      );
    },
  };
}
