import { ConflictException, ForbiddenException } from '#src/shared/exceptions/index.ts';

export class AuthorAlreadyExistsError extends ConflictException {
  constructor(modelId: string, userId: string) {
    super(`User ${userId} is already an author of model ${modelId}`);
  }
}

export class CannotRemoveOwnerError extends ForbiddenException {
  constructor() {
    super('Cannot remove the owner of a model');
  }
}

export class NotOwnerError extends ForbiddenException {
  constructor() {
    super('Only the model owner can perform this action');
  }
}
