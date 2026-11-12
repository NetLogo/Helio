import { ConflictException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class ModelNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Model with id ${id} not found`);
  }
}

export class ModelAlreadyDeletedError extends ConflictException {
  constructor(id: string) {
    super(`Model ${id} is already deleted`);
  }
}
