import env from '#src/config/env.ts';
import {
  createRenderer,
  type EmailModel,
  type EmailRenderer,
  type NotificationSummaryItem,
} from '@repo/emails';
import type Mail from 'nodemailer/lib/mailer/index.js';

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

type CommentEmailOptions = {
  userEmail: string;
  userName: string;
  actorName: string;
  model: EmailModel;
  commentPreview: string;
  commentUrl: string;
  unsubscribeUrl: string;
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
    withOneClickUnsubscribe(content: Mail.Options, unsubscribeUrl: string): Mail.Options {
      return {
        ...content,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    },

    async createVerificationEmail(userEmail: string, userName: string, verificationLink: string) {
      return wrap(userEmail)(renderer.renderVerifyEmail({ userName, verificationLink }));
    },

    async createPasswordResetEmail(userEmail: string, userName: string, resetLink: string) {
      return wrap(userEmail)(renderer.renderPasswordResetEmail({ userName, resetLink }));
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

    async createNotificationSummaryEmail(
      userEmail: string,
      userName: string,
      notifications: Array<NotificationSummaryItem>,
      moreCount: number,
      feedUrl: string,
      unsubscribeUrl: string,
      preferencesUrl: string,
    ) {
      return wrap(userEmail)(
        renderer.renderNotificationSummaryEmail({
          userName,
          notifications,
          moreCount,
          feedUrl,
          unsubscribeUrl,
          preferencesUrl,
        }),
      );
    },

    async createCommentedOnModelEmail({
      userEmail,
      userName,
      actorName,
      model,
      commentPreview,
      commentUrl,
      unsubscribeUrl,
    }: CommentEmailOptions) {
      return wrap(userEmail)(
        renderer.renderCommentedOnModelEmail({
          userName,
          commenterName: actorName,
          model,
          commentPreview,
          commentUrl,
          unsubscribeUrl,
        }),
      );
    },

    async createRepliedToCommentEmail({
      userEmail,
      userName,
      actorName,
      model,
      commentPreview,
      commentUrl,
      unsubscribeUrl,
    }: CommentEmailOptions) {
      return wrap(userEmail)(
        renderer.renderRepliedToCommentEmail({
          userName,
          replierName: actorName,
          model,
          replyPreview: commentPreview,
          commentUrl,
          unsubscribeUrl,
        }),
      );
    },
  };
}
