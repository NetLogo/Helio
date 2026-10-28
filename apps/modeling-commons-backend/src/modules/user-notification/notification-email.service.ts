import notificationsConfig from '#src/config/notifications.ts';
import type Mail from 'nodemailer/lib/mailer/index.js';

export type ClaimedEmailBuilder = (
  claimedIds: ReadonlyArray<string>,
) => Promise<Mail.Options | null>;

type HeldClaim = {
  ids: Array<string>;
  claimedAt: Date;
};

export default function makeNotificationEmailService({
  userNotificationRepository,
  mailService,
  logger,
}: Dependencies) {
  async function claimRows(rowIds: ReadonlyArray<string>): Promise<HeldClaim | null> {
    const claims = await userNotificationRepository.claimUnsent(
      [...rowIds],
      notificationsConfig.claimLeaseMs,
    );
    const first = claims[0];
    if (!first) return null;

    return { ids: claims.map((claim) => claim.id), claimedAt: first.emailClaimedAt };
  }

  async function releaseOnFailure<T>(claim: HeldClaim, work: () => Promise<T>): Promise<T> {
    return work().catch(async (error: unknown) => {
      await userNotificationRepository.releaseClaim(claim.ids, claim.claimedAt);
      throw error;
    });
  }

  async function markClaimSent(claim: HeldClaim): Promise<void> {
    await userNotificationRepository
      .markSent(claim.ids, claim.claimedAt, new Date())
      .catch((error: unknown) => {
        logger.error({
          name: 'NotificationEmailService',
          message: 'The claimed rows were handled but could not be marked as sent',
          error,
        });
      });
  }

  return {
    async sendClaimed(
      rowIds: ReadonlyArray<string>,
      buildEmail: ClaimedEmailBuilder,
    ): Promise<void> {
      const claim = await claimRows(rowIds);
      if (!claim) return;

      const content = await releaseOnFailure(claim, async () => buildEmail(claim.ids));
      if (content) await releaseOnFailure(claim, async () => mailService.sendMailAsync(content));
      await markClaimSent(claim);
    },
  };
}
