import { ArgumentInvalidException } from '#src/shared/exceptions/index.ts';

export class UnknownCategoryError extends ArgumentInvalidException {
  constructor(category: string) {
    super(`Unknown notification category: ${category}`);
  }
}
