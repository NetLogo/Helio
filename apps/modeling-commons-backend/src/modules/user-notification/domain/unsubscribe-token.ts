import { createHmac, timingSafeEqual } from 'node:crypto';

export type UnsubscribeClaims<Category extends string = string> = {
  userId: string;
  categories: Array<Category>;
};

type EncodedClaims = { u: string; c: Array<string> };

const SEPARATOR = '.';

export function deriveUnsubscribeKey(secret: string, purpose: string): Buffer {
  return createHmac('sha256', secret).update(purpose).digest();
}

function sign(key: Buffer, payload: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function normalizeCategories<Category extends string>(
  categories: ReadonlyArray<Category>,
): Array<Category> {
  return [...new Set(categories)].sort();
}

function isEncodedClaims(value: unknown): value is EncodedClaims {
  if (typeof value !== 'object' || value === null) return false;
  const { u, c } = value as Partial<EncodedClaims>;
  return (
    typeof u === 'string' &&
    u.length > 0 &&
    Array.isArray(c) &&
    c.length > 0 &&
    c.every((category) => typeof category === 'string')
  );
}

function parsePayload(payload: string): unknown {
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

export function signUnsubscribeToken<Category extends string>(
  key: Buffer,
  { userId, categories }: UnsubscribeClaims<Category>,
): string {
  const encoded: EncodedClaims = { u: userId, c: normalizeCategories(categories) };
  const payload = Buffer.from(JSON.stringify(encoded), 'utf8').toString('base64url');
  return `${payload}${SEPARATOR}${sign(key, payload)}`;
}

export function verifyUnsubscribeToken<Category extends string>(
  key: Buffer,
  token: string,
  isCategory: (value: string) => value is Category,
): UnsubscribeClaims<Category> | undefined {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return undefined;
  const [payload = '', signature = ''] = parts;

  const expected = Buffer.from(sign(key, payload), 'utf8');
  const given = Buffer.from(signature, 'utf8');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;

  const claims = parsePayload(payload);
  if (!isEncodedClaims(claims)) return undefined;
  const categories = claims.c.filter(isCategory);
  if (categories.length === 0) return undefined;
  return { userId: claims.u, categories };
}
