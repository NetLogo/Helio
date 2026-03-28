import { ArgumentInvalidException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class FileNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`File with id ${id} not found`);
  }
}

export class FileTooLargeError extends ArgumentInvalidException {
  constructor(size: number, max: number) {
    super(`File size ${size} bytes exceeds maximum of ${max} bytes`);
  }
}

export class FileTypeNotAllowedError extends ArgumentInvalidException {
  constructor(contentType: string) {
    super(`Content type ${contentType} is not allowed`);
  }
}
