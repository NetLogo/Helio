import { ConflictException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class VersionNotFoundError extends NotFoundException {
  constructor(modelId: string, version?: number) {
    super(
      version !== undefined
        ? `Version ${version} of model ${modelId} not found`
        : `No version found for model ${modelId}`,
    );
  }
}

export class VersionFinalizedError extends ConflictException {
  constructor(versionId: string) {
    super(`Version ${versionId} is finalized and cannot be modified`);
  }
}
