import {
  ArgumentInvalidException,
  ConflictException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

export class NotificationNotFoundError extends NotFoundException {
  constructor(notificationId: string) {
    super(`Notification ${notificationId} not found`);
  }
}

export class NotificationsAlreadySentError extends ConflictException {
  constructor() {
    super('Some of these notifications were already emailed. Try again.');
  }
}

export class NotificationCategoryClaimError extends Error {
  constructor(category: string, producerNames: ReadonlyArray<string>) {
    super(
      producerNames.length === 0
        ? `Notification category ${category} is claimed by no producer`
        : `Notification category ${category} is claimed by ${producerNames.length} producers: ${producerNames.join(', ')}`,
    );
  }
}

export class InvalidUnsubscribeTokenError extends ArgumentInvalidException {
  constructor() {
    super('This unsubscribe link is invalid.');
  }
}
