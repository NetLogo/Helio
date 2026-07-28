import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import {
  NotificationAlreadyDeliveredError,
  NotificationSuppressedError,
  RecipientBannedError,
  RecipientDeletedError,
  RecipientEmailDisabledError,
  RecipientEmailNotFoundError,
  RecipientNotFoundError,
} from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type {
  NotificationCategory,
  NotificationCategoryInfo,
  NotificationChannels,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

export type EligibleRecipient = UserEntity & { email: string };

const SKIPPABLE_DELIVERY_ERRORS = [
  RecipientNotFoundError,
  RecipientDeletedError,
  RecipientBannedError,
  RecipientEmailNotFoundError,
  NotificationSuppressedError,
  RecipientEmailDisabledError,
  NotificationAlreadyDeliveredError,
] as const;

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

    assertRecipientEligible(
      recipient: UserEntity | undefined,
      recipientId: string,
    ): EligibleRecipient {
      if (!recipient) throw new RecipientNotFoundError(recipientId);
      if (recipient.deletedAt) throw new RecipientDeletedError(recipientId);
      if (recipient.banned) throw new RecipientBannedError(recipientId);
      if (!recipient.email) throw new RecipientEmailNotFoundError(recipientId);
      return { ...recipient, email: recipient.email };
    },

    assertChannelsEnabled(
      resolved: NotificationChannels,
      recipientId: string,
      category: NotificationCategory,
    ): void {
      if (!resolved.email && !resolved.inApp) {
        throw new NotificationSuppressedError(recipientId, category);
      }
    },

    // Combines the dedupe guard (was this event/recipient/category already delivered?) and
    // the email-channel check into the single decision that gates sending mail.
    assertEmailDeliverable(
      insertedNotificationId: string | undefined,
      resolved: NotificationChannels,
      eventId: string,
      recipientId: string,
      category: NotificationCategory,
    ): string {
      if (!insertedNotificationId) throw new NotificationAlreadyDeliveredError(eventId, recipientId);
      if (!resolved.email) throw new RecipientEmailDisabledError(recipientId, category);
      return insertedNotificationId;
    },

    isSkippableDeliveryError(error: unknown): boolean {
      return SKIPPABLE_DELIVERY_ERRORS.some((ErrorClass) => error instanceof ErrorClass);
    },
  };
}
