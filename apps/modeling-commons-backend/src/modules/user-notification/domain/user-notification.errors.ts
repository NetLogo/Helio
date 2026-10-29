import { ConflictException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class NotificationNotFoundError extends NotFoundException {
  constructor(notificationId: string) {
    super(`Notification ${notificationId} not found`);
  }
}

export class NotificationRowsAlreadySentError extends ConflictException {
  constructor() {
    super('Some of these notifications were already emailed. Try again.');
  }
}
