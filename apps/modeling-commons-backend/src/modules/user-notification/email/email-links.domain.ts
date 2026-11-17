import apiLinks from '#src/config/api-links.ts';
import links from '#src/config/links.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import { signUnsubscribeToken } from '#src/modules/user-notification/core/unsubscribe-token.domain.ts';
import type { Email } from '#src/modules/user-notification/core/types/index.ts';

export async function getEmailLinks(
  recipientId: string,
  emailedCategories: ReadonlyArray<NotificationCategory>,
): Promise<Email.Links> {
  const token = await signUnsubscribeToken({
    userId: recipientId,
    categories: [...emailedCategories],
  });
  return {
    unsubscribeUrl: links.notificationUnsubscribe(token),
    oneClickUnsubscribeUrl: apiLinks.notificationUnsubscribe(token),
    preferencesUrl: links.notificationPreferences(),
  };
}
