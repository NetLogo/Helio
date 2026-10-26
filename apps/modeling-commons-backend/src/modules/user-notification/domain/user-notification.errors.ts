import { ArgumentInvalidException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class UnknownCategoryError extends ArgumentInvalidException {
  constructor(category: string) {
    super(`Unknown notification category: ${category}`);
  }
}

export class NotificationNotFoundError extends NotFoundException {
  constructor(notificationId: string) {
    super(`Notification ${notificationId} not found`);
  }
}
