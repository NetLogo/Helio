import { NotFoundException } from '#src/shared/exceptions/index.ts';

export class AdditionalFileNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Additional file with id ${id} not found`);
  }
}
