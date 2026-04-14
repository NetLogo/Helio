import { describe, it, expect, vi, afterEach } from 'vitest';
import { signDownloadToken, verifyDownloadToken } from '#src/shared/services/signed-url.service.ts';

describe('signed-url service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('roundtrip: sign then verify returns valid with correct fileId', () => {
    const token = signDownloadToken('file-abc');
    const result = verifyDownloadToken(token);
    expect(result).toEqual({ fileId: 'file-abc', valid: true });
  });

  it('rejects an expired token', () => {
    const token = signDownloadToken('file-abc', -1);
    const result = verifyDownloadToken(token);
    expect(result.valid).toBe(false);
    expect(result.fileId).toBe('file-abc');
  });

  it('rejects a tampered token', () => {
    const token = signDownloadToken('file-abc');
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    parts[2] = 'tampered';
    const tampered = Buffer.from(parts.join(':')).toString('base64url');
    const result = verifyDownloadToken(tampered);
    expect(result.valid).toBe(false);
  });

  it('rejects a token with wrong fileId spliced in', () => {
    const token = signDownloadToken('file-abc');
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    parts[0] = 'file-xyz';
    const modified = Buffer.from(parts.join(':')).toString('base64url');
    const result = verifyDownloadToken(modified);
    expect(result.valid).toBe(false);
  });

  it('rejects garbage input', () => {
    expect(verifyDownloadToken('not-a-token')).toEqual({ fileId: '', valid: false });
    expect(verifyDownloadToken('')).toEqual({ fileId: '', valid: false });
  });
});
