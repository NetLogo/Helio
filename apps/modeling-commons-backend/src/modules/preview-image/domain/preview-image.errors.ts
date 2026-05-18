import { ProviderErrorException } from '#src/shared/exceptions/exceptions.ts';

export class ModelPreviewServiceError extends ProviderErrorException {
  constructor(modelId: string, versionNumber: number, cause?: Error) {
    super(
      `Preview image for version ${versionNumber} of model ${modelId} could not be generated`,
      cause,
    );
  }
}

export class ModelPreviewTimeoutError extends ModelPreviewServiceError {
  constructor(modelId: string, versionNumber: number) {
    super(modelId, versionNumber, new Error(`Preview image generation timed out after 30 seconds`));
  }
}

export class ModelPreviewTooLargeError extends ModelPreviewServiceError {
  constructor(modelId: string, versionNumber: number) {
    super(modelId, versionNumber, new Error(`Preview image exceeded size limit of 10MB`));
  }
}
