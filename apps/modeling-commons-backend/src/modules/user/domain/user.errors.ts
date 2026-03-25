import { ForbiddenException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class UserNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`User with id ${id} not found`);
  }
}

export class UserProfilePrivateError extends ForbiddenException {
  constructor(id: string) {
    super(`User profile ${id} is private`);
  }
}
