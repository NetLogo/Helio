import env from '#src/config/env.ts';
import { createRenderer, type EmailRenderer } from '@repo/emails';

let _renderer: EmailRenderer | null = null;
function getRenderer(): EmailRenderer {
  if (_renderer) return _renderer;
  _renderer = createRenderer({
    branding: {
      productName: env.product.name,
      brandColor: env.product.brandColor,
      logoUrl: env.product.logoUrl,
      supportEmail: env.product.supportEmail,
    },
  });
  return _renderer;
}

export default function mailDomain() {
  const sender = `${env.product.name} <${env.smtp.senderAddress}>`;
  const renderer = getRenderer();

  const wrap =
    (to: string) =>
    async <T extends { subject: string; html: string; text: string }>(rendered: Promise<T>) => {
      const { subject, html, text } = await rendered;
      return { from: sender, to, subject, html, text };
    };

  return {
    createVerificationEmail(userEmail: string, userName: string, verificationLink: string) {
      return wrap(userEmail)(renderer.renderVerifyEmail({ userName, verificationLink }));
    },

    createPasswordResetEmail(userEmail: string, userName: string, resetLink: string) {
      return wrap(userEmail)(renderer.renderPasswordResetEmail({ userName, resetLink }));
    },

    createWelcomeEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderWelcomeEmail({ userName }));
    },

    createAccountDeletedEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderAccountDeletedEmail({ userName }));
    },

    createAccountDeletedByAdminEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderAccountDeletedByAdminEmail({ userName }));
    },

    createAccountBannedEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderAccountBannedEmail({ userName }));
    },

    createAccountInactiveEmail(userEmail: string, userName: string, inactivityPeriod: string) {
      return wrap(userEmail)(renderer.renderAccountInactiveEmail({ userName, inactivityPeriod }));
    },

    createNotificationEmail(
      userEmail: string,
      userName: string,
      notificationContent: string,
      unsubscribeUrl: string,
    ) {
      return wrap(userEmail)(
        renderer.renderNotificationEmail({ userName, notificationContent, unsubscribeUrl }),
      );
    },

    createNotificationSummaryEmail(
      userEmail: string,
      userName: string,
      notifications: Array<string>,
      unsubscribeUrl: string,
    ) {
      return wrap(userEmail)(
        renderer.renderNotificationSummaryEmail({ userName, notifications, unsubscribeUrl }),
      );
    },
  };
}
