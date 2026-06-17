import { ProviderErrorException } from '#src/shared/exceptions/exceptions.ts';

export class ModelPreviewServiceError extends ProviderErrorException {
  constructor(message: string = 'Model preview generation failed') {
    super(message);
  }
}

export class ModelPreviewTimeoutError extends ModelPreviewServiceError {
  constructor() {
    super(`Preview image generation timed out after 30 seconds`);
  }
}

export class ModelPreviewTooLargeError extends ModelPreviewServiceError {
  constructor() {
    super(`Preview image exceeded size limit of 5MB`);
  }
}
