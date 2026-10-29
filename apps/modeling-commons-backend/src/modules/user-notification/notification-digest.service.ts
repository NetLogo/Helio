import links from '#src/config/links.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type {
  DeliverableRecipient,
  DigestRow,
  NotificationCategory,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

export default function makeNotificationDigestService({
  userRepository,
  userDomain,
  notificationPreferenceRepository,
  userNotificationRepository,
  userNotificationDomain,
  resolveNotificationSubjectsQuery,
  notificationEmailService,
  mailDomain,
}: Dependencies) {
  async function buildDigestEmail(
    recipient: DeliverableRecipient,
    emailable: ReadonlyArray<DigestRow>,
    rowIds: ReadonlyArray<string>,
  ): Promise<Mail.Options | null> {
    const rowIdSet = new Set(rowIds);
    const rows = emailable.filter((row) => rowIdSet.has(row.id));
    const subjects = await resolveNotificationSubjectsQuery.execute(rows, recipient.id, {
      includeThumbnails: false,
    });
    const digest = userNotificationDomain.buildDigest(rows, subjects);
    if (digest.items.length === 0) return null;

    return mailDomain.createNotificationSummaryEmail(
      recipient.email,
      userDomain.formatGreetingName(recipient),
      digest.items,
      digest.moreCount,
      links.notifications(),
      links.support(),
      links.notificationPreferences(),
    );
  }

  async function queueDigest(
    recipientId: string,
    rows: ReadonlyArray<DigestRow>,
    preferences: ReadonlyArray<NotificationPreferenceRecord>,
  ): Promise<void> {
    const recipient = await userRepository.findOneById(recipientId);
    if (!userNotificationDomain.isDeliverableRecipient(recipient)) return;

    const emailable = userNotificationDomain.listEmailEnabledRows(rows, preferences);
    if (emailable.length === 0) return;

    await notificationEmailService.queueRows(
      emailable.map((row) => row.id),
      async (rowIds) => buildDigestEmail(recipient, emailable, rowIds),
    );
  }

  async function queueFlushedDigest(
    recipientId: string,
    categories: Array<NotificationCategory>,
  ): Promise<void> {
    const { since, until } = userNotificationDomain.getFlushWindow(new Date());
    const preferences = await notificationPreferenceRepository.findAllByUser(recipientId);
    const rows = await userNotificationRepository.findPendingForRecipient(
      recipientId,
      categories,
      since,
      until,
    );
    await queueDigest(recipientId, rows, preferences);
  }

  return { queueDigest, queueFlushedDigest };
}
