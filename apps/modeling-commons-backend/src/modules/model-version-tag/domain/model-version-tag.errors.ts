import { ConflictException } from '#src/shared/exceptions/index.ts';

export class TagAlreadyAppliedError extends ConflictException {
  constructor(modelId: string, versionNumber: number, tagId: string) {
    super(`Tag ${tagId} is already applied to version ${versionNumber} of model ${modelId}`);
  }
}

export class CannotModifyFinalizedVersionError extends ConflictException {
  constructor(modelId: string, versionNumber: number) {
    super(`Cannot modify tags on finalized version ${versionNumber} of model ${modelId}`);
  }
}
