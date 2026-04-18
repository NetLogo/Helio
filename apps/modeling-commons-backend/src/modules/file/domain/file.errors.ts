import { ArgumentInvalidException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class FileNotFoundError extends NotFoundException {
  constructor(key: string) {
    super(`File with key ${key} not found`);
  }
}

export class FileValidationError extends ArgumentInvalidException {
  constructor(key: string, reason: string) {
    super(`File with key ${key} is invalid: ${reason}`);
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
