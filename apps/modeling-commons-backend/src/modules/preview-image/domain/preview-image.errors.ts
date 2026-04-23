import { ProviderErrorException } from '#src/shared/exceptions/exceptions.ts';

export class ModelPreviewServiceError extends ProviderErrorException {
  constructor(modelId: string, versionNumber: number, cause?: Error) {
    super(
      `Preview image for version ${versionNumber} of model ${modelId} could not be generated`,
      cause,
    );
  }
}
