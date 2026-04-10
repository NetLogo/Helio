import { NotFoundException } from '#src/shared/exceptions/index.ts';

export class UserNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`User with id ${id} not found`);
  }
}
