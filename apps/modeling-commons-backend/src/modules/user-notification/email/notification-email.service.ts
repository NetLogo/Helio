import { NotificationsAlreadySentError } from '#src/modules/user-notification/core/notification.errors.ts';
import { getEmailLinks } from '#src/modules/user-notification/email/email-links.domain.ts';
import type { Email } from '#src/modules/user-notification/core/types/index.ts';

export default function makeNotificationEmailService({
  userNotificationRepository,
  mailService,
  mailDomain,
  transactionManager,
}: Dependencies) {
  async function renderWithLinks(recipientId: string, { categories, render }: Email.Queued) {
    const emailLinks = await getEmailLinks(recipientId, categories);
    const content = await render(emailLinks);
    return mailDomain.withOneClickUnsubscribe(content, emailLinks.oneClickUnsubscribeUrl);
  }

  return {
    async queueNotifications(
      recipientId: string,
      notificationIds: ReadonlyArray<string>,
      queued: Email.Queued | null,
      digestDay?: Date,
    ): Promise<void> {
      const content = queued && (await renderWithLinks(recipientId, queued));
      await transactionManager.run(async (ctx) => {
        if (
          digestDay &&
          !(await userNotificationRepository.claimDigestTx(recipientId, digestDay, ctx))
        ) {
          return;
        }
        const markedIds = await userNotificationRepository.markEmailSentTx(
          [...notificationIds],
          new Date(),
          ctx,
        );
        if (markedIds.length === 0) return;
        if (markedIds.length < notificationIds.length) throw new NotificationsAlreadySentError();
        if (content) await mailService.enqueue(content, ctx);
      });
    },
  };
}
