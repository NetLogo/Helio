import { createHmac, timingSafeEqual } from 'node:crypto';
import env from '#src/config/env.ts';

const DEFAULT_TTL_SECONDS = 15 * 60;

function computeHmac(payload: string): string {
  return createHmac('sha256', env.auth.secret).update(payload).digest('base64url');
}

export function signDownloadToken(fileId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileId}:${expiresAt}`;
  const hmac = computeHmac(payload);
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifyDownloadToken(token: string): { fileId: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return { fileId: '', valid: false };

    const fileId = parts[0]!;
    const expiresAtStr = parts[1]!;
    const providedHmac = parts[2]!;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Number.isNaN(expiresAt)) return { fileId: '', valid: false };

    if (Date.now() / 1000 > expiresAt) return { fileId, valid: false };

    const expectedHmac = computeHmac(`${fileId}:${expiresAtStr}`);
    const expected = Buffer.from(expectedHmac);
    const provided = Buffer.from(providedHmac);
    if (expected.length !== provided.length) return { fileId, valid: false };
    if (!timingSafeEqual(expected, provided)) return { fileId, valid: false };

    return { fileId, valid: true };
  } catch {
    return { fileId: '', valid: false };
  }
}
