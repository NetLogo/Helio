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

export class VersionPreviewImageNotFoundError extends NotFoundException {
  constructor(modelId: string, version: number) {
    super(`Preview image for version ${version} of model ${modelId} not found`);
  }
}

export class VersionFinalizedError extends ConflictException {
  constructor(modelId: string, versionNumber: number) {
    super(`Version ${versionNumber} of model ${modelId} is finalized and cannot be modified`);
  }
}
