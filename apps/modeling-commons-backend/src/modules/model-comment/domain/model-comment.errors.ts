import {
  ArgumentInvalidException,
  ConflictException,
  NotFoundException,
} from '#src/shared/exceptions/index.ts';

export class CommentNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Comment ${id} not found`);
  }
}

export class CommentDeletedError extends ConflictException {
  constructor(id: string) {
    super(`Comment ${id} is deleted`);
  }
}

export class CommentBodyInvalidError extends ArgumentInvalidException {
  constructor(reason: string) {
    super(`Invalid comment content: ${reason}`);
  }
}

export class ParentCommentMismatchError extends ArgumentInvalidException {
  constructor() {
    super('Parent comment belongs to a different model');
  }
}
