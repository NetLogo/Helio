import type {
  NotificationCategory,
  NotificationCategoryInfo,
  NotificationChannels,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

const catalog = {
  'comment.on_your_model': {
    label: 'Comments on your models',
    description: 'When someone comments on a model you author.',
    defaults: { email: true, inApp: true },
  },
  'comment.reply_to_you': {
    label: 'Replies to your comments',
    description: 'When someone replies directly to a comment you wrote.',
    defaults: { email: true, inApp: true },
  },
  'general.daily_digest': {
    label: 'Daily digest',
    description: 'A daily summary of activity relevant to you.',
    defaults: { email: true, inApp: false },
  },
} as const satisfies Record<NotificationCategory, Omit<NotificationCategoryInfo, 'category'>>;

const categories: Array<NotificationCategoryInfo> = (
  Object.keys(catalog) as Array<NotificationCategory>
).map((category) => ({ category, ...catalog[category] }));

export default function userNotificationDomain() {
  return {
    categories,

    isKnownCategory(value: string): value is NotificationCategory {
      return value in catalog;
    },

    resolvePreference(
      category: NotificationCategory,
      override?: Partial<NotificationChannels> | null,
    ): NotificationChannels {
      const defaults = catalog[category].defaults;
      return {
        email: override?.email ?? defaults.email,
        inApp: override?.inApp ?? defaults.inApp,
      };
    },
  };
}
