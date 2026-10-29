import { NotificationRowsAlreadySentError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

export type QueuedEmailBuilder = (rowIds: ReadonlyArray<string>) => Promise<Mail.Options | null>;

export default function makeNotificationEmailService({
  userNotificationRepository,
  mailService,
  transactionManager,
}: Dependencies) {
  return {
    async queueRows(rowIds: ReadonlyArray<string>, buildEmail: QueuedEmailBuilder): Promise<void> {
      const content = await buildEmail(rowIds);
      await transactionManager.run(async (ctx) => {
        const markedIds = await userNotificationRepository.markEmailSentTx(
          [...rowIds],
          new Date(),
          ctx,
        );
        if (markedIds.length === 0) return;
        if (markedIds.length < rowIds.length) throw new NotificationRowsAlreadySentError();
        if (content) await mailService.enqueue(content, ctx);
      });
    },
  };
}
