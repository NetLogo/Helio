import { UnknownCategoryError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type { NotificationCategory } from '#src/modules/user-notification/domain/user-notification.types.ts';

export type UpdatePreferenceInput = {
  category: string;
  email?: boolean;
  inApp?: boolean;
};

type ValidatedPreferenceInput = {
  category: NotificationCategory;
  email?: boolean;
  inApp?: boolean;
};

export default function makeUserNotificationService({
  transactionManager,
  notificationPreferenceRepository,
  userNotificationDomain,
}: Dependencies) {
  return {
    async updatePreferences(
      userId: string,
      preferences: Array<UpdatePreferenceInput>,
    ): Promise<void> {
      const validated: Array<ValidatedPreferenceInput> = preferences.map((preference) => {
        const { category } = preference;
        if (!userNotificationDomain.isKnownCategory(category)) {
          throw new UnknownCategoryError(category);
        }
        return { category, email: preference.email, inApp: preference.inApp };
      });

      const existing = await notificationPreferenceRepository.findAllByUser(userId);
      const existingByCategory = new Map(existing.map((row) => [row.category, row]));

      await transactionManager.run(async (ctx) => {
        for (const preference of validated) {
          const resolved = userNotificationDomain.resolvePreference(
            preference.category,
            existingByCategory.get(preference.category),
          );

          await notificationPreferenceRepository.upsertTx(ctx, {
            userId,
            category: preference.category,
            email: preference.email ?? resolved.email,
            inApp: preference.inApp ?? resolved.inApp,
          });
        }
      });
    },
  };
}
