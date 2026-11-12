import links from '#src/config/links.ts';
import {
  listCategoriesOf,
  listDailyCategories,
} from '#src/modules/user-notification/core/channel-preferences.domain.ts';
import { hasDeliverableEmail } from '#src/modules/user-notification/core/recipient.domain.ts';
import { buildDigest, getDigestDay } from '#src/modules/user-notification/digest/digest.domain.ts';
import type {
  Digest,
  Email,
  Notification,
} from '#src/modules/user-notification/core/types/index.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';

export default function makeNotificationDigestService({
  userRepository,
  userDomain,
  notificationPreferenceRepository,
  userNotificationRepository,
  producerLookupDomain,
  getNotificationSubjectsQuery,
  notificationEmailService,
  mailDomain,
}: Dependencies) {
  async function buildDigestEmail(
    recipient: Email.UserWithEmail,
    notifications: ReadonlyArray<Notification>,
  ): Promise<Email.Queued | null> {
    const subjects = await getNotificationSubjectsQuery.execute(notifications, recipient.id);
    const digest = buildDigest(notifications, subjects, producerLookupDomain.moduleByCategory);
    if (digest.items.length === 0) return null;

    return {
      categories: listCategoriesOf(notifications),
      render: async (emailLinks) =>
        mailDomain.createNotificationSummaryEmail(
          recipient.email,
          userDomain.formatGreetingName(recipient),
          digest.items,
          digest.moreCount,
          links.notifications(),
          emailLinks.unsubscribeUrl,
          emailLinks.preferencesUrl,
        ),
    };
  }

  async function queueDigest(
    recipientId: string,
    window: Digest.Window,
    categories: ReadonlyArray<NotificationCategory> | undefined,
    digestDay: Date | undefined,
  ): Promise<void> {
    const recipient = await userRepository.findOneById(recipientId);
    if (!hasDeliverableEmail(recipient)) return;

    const emailCategories =
      categories ??
      listDailyCategories(await notificationPreferenceRepository.findAllByUser(recipientId));
    const notifications = await userNotificationRepository.findPendingForRecipient(
      recipientId,
      [...emailCategories],
      window.since,
      window.until,
    );
    if (notifications.length === 0) return;

    await notificationEmailService.queueNotifications(
      recipient.id,
      notifications.map((notification) => notification.id),
      await buildDigestEmail(recipient, notifications),
      digestDay,
    );
  }

  return {
    async sendDailyDigest(recipientId: string, window: Digest.Window): Promise<void> {
      await queueDigest(recipientId, window, undefined, getDigestDay(window));
    },

    async queueDigestFor(
      recipientId: string,
      window: Digest.Window,
      categories: ReadonlyArray<NotificationCategory>,
    ): Promise<void> {
      await queueDigest(recipientId, window, categories, undefined);
    },
  };
}
