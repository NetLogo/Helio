import {
  ArgumentInvalidException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

export class ModelDraftNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Model draft with id ${id} not found`);
  }
}

export class ModelDraftAccessDeniedError extends ForbiddenException {
  constructor() {
    super('Access to this draft is denied');
  }
}

export class ModelDraftFileNotFoundError extends NotFoundException {
  constructor(fileId: string) {
    super(`File ${fileId} not found in draft`);
  }
}

export class ModelDraftInvalidPayloadError extends ArgumentInvalidException {
  constructor(detail: string) {
    super(`Invalid draft payload: ${detail}`);
  }
}

export class ModelDraftNotPublishableError extends ConflictException {
  constructor(detail: string) {
    super(`Draft cannot be published: ${detail}`);
  }
}

export class UnknownDraftSchemaVersionError extends ArgumentInvalidException {
  constructor(version: number) {
    super(`Unknown draft schemaVersion ${version}`);
  }
}
