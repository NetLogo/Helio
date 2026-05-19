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

export type MailContent = {
  subject: string;
  html: string;
  text: string;
};

export default function mailDomain() {
  const sender = `${env.product.name} <${env.smtp.senderAddress}>`;
  const renderer = getRenderer();

  const wrap =
    (to: string) =>
    async <T extends MailContent>(rendered: Promise<T>) => {
      const { subject, html, text } = await rendered;
      return { from: sender, to, subject, html, text };
    };

  return {
    async createVerificationEmail(userEmail: string, userName: string, verificationLink: string) {
      return wrap(userEmail)(renderer.renderVerifyEmail({ userName, verificationLink }));
    },

    async createPasswordResetEmail(userEmail: string, userName: string, resetLink: string) {
      return wrap(userEmail)(renderer.renderPasswordResetEmail({ userName, resetLink }));
    },

    async createWelcomeEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderWelcomeEmail({ userName }));
    },

    async createAccountDeletedEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderAccountDeletedEmail({ userName }));
    },

    async createAccountDeletedByAdminEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderAccountDeletedByAdminEmail({ userName }));
    },

    async createAccountBannedEmail(userEmail: string, userName: string) {
      return wrap(userEmail)(renderer.renderAccountBannedEmail({ userName }));
    },

    async createAccountInactiveEmail(userEmail: string, userName: string, inactivityPeriod: string) {
      return wrap(userEmail)(renderer.renderAccountInactiveEmail({ userName, inactivityPeriod }));
    },

    async createAccountEmailChangeRequestEmail(
      userEmail: string,
      userName: string,
      newEmail: string,
      approveLink: string,
    ) {
      return wrap(userEmail)(
        renderer.renderAccountEmailChangeRequestEmail({ userName, newEmail, approveLink }),
      );
    },

    async createAccountEmailChangedEmail(userEmail: string, userName: string, newEmail: string) {
      return wrap(userEmail)(renderer.renderAccountEmailChangedEmail({ userName, newEmail }));
    },

    async createNotificationEmail(
      userEmail: string,
      userName: string,
      notificationContent: string,
      unsubscribeUrl: string,
    ) {
      return wrap(userEmail)(
        renderer.renderNotificationEmail({ userName, notificationContent, unsubscribeUrl }),
      );
    },

    async createNotificationSummaryEmail(
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
