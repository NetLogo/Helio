import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

export class ModelNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Model with id ${id} not found`);
  }
}

export class ModelAccessDeniedError extends ForbiddenException {
  constructor() {
    super('Access to this model is denied');
  }
}

export class ModelAlreadyDeletedError extends ConflictException {
  constructor(id: string) {
    super(`Model ${id} is already deleted`);
  }
}
