import { render } from '@react-email/render';
import * as React from 'react';
import AccountBannedEmail from './templates/1-Account/AccountBanned.js';
import AccountDeletedByAdminEmail from './templates/1-Account/AccountDeletedByAdmin.js';
import AccountInactiveEmail from './templates/1-Account/AccountInactive.js';
import AccountDeletedEmail from './templates/1-Account/AcctionDeleted.js';
import NotificationEmail from './templates/2-Notifications/NotificationEmail.js';
import NotificationSummaryEmail from './templates/2-Notifications/NotificationSummaryEmail.js';
import { PasswordResetEmail } from './templates/PasswordResetEmail.js';
import { VerifyEmail } from './templates/VerifyEmail.js';
import { WelcomeEmail } from './templates/WelcomeEmail.js';
import type { Branding } from './types/branding.js';

export type { Branding } from './types/branding.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface CreateRendererOptions {
  branding: Branding;
}

/**
 * Create a renderer bound to a specific brand. Each method returns the
 * rendered subject + HTML + plaintext, ready to drop into nodemailer / SES /
 * any transport.
 */
export function createRenderer({ branding }: CreateRendererOptions) {
  async function renderBoth(element: React.ReactElement): Promise<{
    html: string;
    text: string;
  }> {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return { html, text };
  }

  return {
    async renderVerifyEmail(args: {
      userName: string;
      verificationLink: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <VerifyEmail branding={branding} {...args} />,
      );
      return {
        subject: `Verify your email for ${branding.productName}`,
        html,
        text,
      };
    },

    async renderPasswordResetEmail(args: {
      userName: string;
      resetLink: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <PasswordResetEmail branding={branding} {...args} />,
      );
      return {
        subject: `Reset your password for ${branding.productName}`,
        html,
        text,
      };
    },

    async renderWelcomeEmail(args: { userName: string }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <WelcomeEmail branding={branding} {...args} />,
      );
      return {
        subject: `Welcome to ${branding.productName}!`,
        html,
        text,
      };
    },

    async renderAccountDeletedEmail(args: {
      userName: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <AccountDeletedEmail branding={branding} {...args} />,
      );
      return {
        subject: `Your ${branding.productName} account has been deleted`,
        html,
        text,
      };
    },

    async renderAccountDeletedByAdminEmail(args: {
      userName: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <AccountDeletedByAdminEmail branding={branding} {...args} />,
      );
      return {
        subject: `Your ${branding.productName} account has been deleted by an administrator`,
        html,
        text,
      };
    },

    async renderAccountBannedEmail(args: {
      userName: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <AccountBannedEmail branding={branding} {...args} />,
      );
      return {
        subject: `Your ${branding.productName} account has been banned`,
        html,
        text,
      };
    },

    async renderAccountInactiveEmail(args: {
      userName: string;
      inactivityPeriod: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <AccountInactiveEmail branding={branding} {...args} />,
      );
      return {
        subject: `Your ${branding.productName} account is inactive`,
        html,
        text,
      };
    },

    async renderNotificationEmail(args: {
      userName: string;
      notificationContent: string;
      unsubscribeUrl: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <NotificationEmail branding={branding} {...args} />,
      );
      return {
        subject: `Notification from ${branding.productName}`,
        html,
        text,
      };
    },

    async renderNotificationSummaryEmail(args: {
      userName: string;
      notifications: string[];
      unsubscribeUrl: string;
    }): Promise<RenderedEmail> {
      const { html, text } = await renderBoth(
        <NotificationSummaryEmail branding={branding} {...args} />,
      );
      return {
        subject: `Your ${branding.productName} Notification Summary`,
        html,
        text,
      };
    },
  };
}

export type EmailRenderer = ReturnType<typeof createRenderer>;
