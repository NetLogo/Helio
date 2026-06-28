import { describe, it, expect } from 'vitest';
import { ModelPreviewServiceError } from '#src/modules/preview-image/domain/preview-image.errors.ts';

describe('preview-image errors', () => {
  it('ModelPreviewServiceError carries the netlogo key and an HTTP 500 status', () => {
    const err = new ModelPreviewServiceError('key.nlogo');
    expect(err.message).toContain('key.nlogo');
    expect(err.statusCode).toBe(500);
  });
});
