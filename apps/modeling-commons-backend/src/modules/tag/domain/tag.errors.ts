import { ArgumentInvalidException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class TagNotFoundError extends NotFoundException {
  constructor(idOrName: string) {
    super(`Tag '${idOrName}' not found`);
  }
}

export class InvalidTagNameError extends ArgumentInvalidException {
  constructor(name: string) {
    super(`Invalid tag name '${name}': must be 1-100 characters, alphanumeric, hyphens, or spaces`);
  }
}
