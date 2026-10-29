import { NotFoundException } from '#src/shared/exceptions/index.ts';

export class NotificationNotFoundError extends NotFoundException {
  constructor(notificationId: string) {
    super(`Notification ${notificationId} not found`);
  }
}
