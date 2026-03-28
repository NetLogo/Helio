import { ConflictException } from '#src/shared/exceptions/index.ts';

export class TagAlreadyAppliedError extends ConflictException {
  constructor(modelVersionId: string, tagId: string) {
    super(`Tag ${tagId} is already applied to version ${modelVersionId}`);
  }
}

export class CannotModifyFinalizedVersionError extends ConflictException {
  constructor(versionId: string) {
    super(`Cannot modify tags on finalized version ${versionId}`);
  }
}
