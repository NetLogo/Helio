import { describe, it, expect } from 'vitest';
import {
  ModelPreviewServiceError,
  ModelPreviewTimeoutError,
  ModelPreviewTooLargeError,
} from '#src/modules/preview-image/domain/preview-image.errors.ts';

describe('preview-image errors', () => {
  it('ModelPreviewServiceError carries the netlogo key and an HTTP 500 status', () => {
    const err = new ModelPreviewServiceError('key.nlogo');
    expect(err.message).toContain('key.nlogo');
    expect(err.statusCode).toBe(500);
  });

  it('ModelPreviewServiceError preserves the original cause', () => {
    const cause = new Error('upstream failure');
    const err = new ModelPreviewServiceError('key.nlogo', cause);
    expect(err.cause).toBe(cause);
  });

  it('ModelPreviewTimeoutError is a ModelPreviewServiceError describing the timeout', () => {
    const err = new ModelPreviewTimeoutError('key.nlogo');
    expect(err).toBeInstanceOf(ModelPreviewServiceError);
    expect((err.cause as Error).message).toMatch(/timed out/i);
  });

  it('ModelPreviewTooLargeError is a ModelPreviewServiceError describing the size limit', () => {
    const err = new ModelPreviewTooLargeError('key.nlogo');
    expect(err).toBeInstanceOf(ModelPreviewServiceError);
    expect((err.cause as Error).message).toMatch(/size limit/i);
  });
});
