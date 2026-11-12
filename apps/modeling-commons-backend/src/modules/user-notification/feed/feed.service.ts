import { assertOwnedByRecipient, isRead } from '#src/modules/user-notification/feed/feed.domain.ts';

export default function makeFeedService({ userNotificationRepository }: Dependencies) {
  return {
    async markRead(userId: string, notificationId: string): Promise<void> {
      const notification = await userNotificationRepository.findOneById(notificationId);
      assertOwnedByRecipient(notification, notificationId, userId);
      if (isRead(notification)) return;

      await userNotificationRepository.markRead(notificationId, new Date());
    },
  };
}
