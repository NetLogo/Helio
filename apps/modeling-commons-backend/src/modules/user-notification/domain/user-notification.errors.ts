import {
  ArgumentInvalidException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

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

export class RecipientNotFoundError extends NotFoundException {
  constructor(recipientId: string) {
    super(`Recipient ${recipientId} not found`);
  }
}

export class RecipientDeletedError extends ConflictException {
  constructor(recipientId: string) {
    super(`Recipient ${recipientId} is deleted`);
  }
}

export class RecipientBannedError extends ForbiddenException {
  constructor(recipientId: string) {
    super(`Recipient ${recipientId} is banned`);
  }
}

export class RecipientEmailNotFoundError extends NotFoundException {
  constructor(recipientId: string) {
    super(`Recipient ${recipientId} has no email address`);
  }
}

export class NotificationSuppressedError extends ConflictException {
  constructor(recipientId: string, category: string) {
    super(`Recipient ${recipientId} has every channel disabled for category ${category}`);
  }
}

export class RecipientEmailDisabledError extends ConflictException {
  constructor(recipientId: string, category: string) {
    super(`Recipient ${recipientId} has disabled email delivery for category ${category}`);
  }
}

export class NotificationAlreadyDeliveredError extends ConflictException {
  constructor(eventId: string, recipientId: string) {
    super(`Event ${eventId} was already delivered to recipient ${recipientId}`);
  }
}
