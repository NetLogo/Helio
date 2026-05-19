import { ProviderErrorException } from '#src/shared/exceptions/exceptions.ts';

export class ModelPreviewServiceError extends ProviderErrorException {
  constructor(netlogoFileKey: string, cause?: Error) {
    super(`Preview image for NetLogo file ${netlogoFileKey} could not be generated`, cause);
  }
}

export class ModelPreviewTimeoutError extends ModelPreviewServiceError {
  constructor(netlogoFileKey: string) {
    super(netlogoFileKey, new Error(`Preview image generation timed out after 30 seconds`));
  }
}

export class ModelPreviewTooLargeError extends ModelPreviewServiceError {
  constructor(netlogoFileKey: string) {
    super(netlogoFileKey, new Error(`Preview image exceeded size limit of 5MB`));
  }
}
