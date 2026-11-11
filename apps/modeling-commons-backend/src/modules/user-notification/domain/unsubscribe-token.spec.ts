import { describe, it, expect } from 'vitest';
import {
  deriveUnsubscribeKey,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from '#src/modules/user-notification/domain/unsubscribe-token.ts';

type Category = 'alpha' | 'beta';

const isCategory = (value: string): value is Category => value === 'alpha' || value === 'beta';
const key = deriveUnsubscribeKey('a-server-secret-that-is-long-enough', 'test-purpose');

function sign(userId: string, categories: Array<Category>): string {
  return signUnsubscribeToken(key, { userId, categories });
}

function verify(token: string) {
  return verifyUnsubscribeToken(key, token, isCategory);
}

function encodePayload(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('unsubscribe token', () => {
  it('reads back the user and categories it was signed for', () => {
    expect(verify(sign('user-a', ['beta', 'alpha', 'beta']))).toEqual({
      userId: 'user-a',
      categories: ['alpha', 'beta'],
    });
  });

  it('signs the same claims to the same token regardless of category order', () => {
    expect(sign('user-a', ['beta', 'alpha'])).toBe(sign('user-a', ['alpha', 'beta']));
  });

  it("never verifies one user's signature for another user or another category", () => {
    const [, signature] = sign('user-a', ['alpha']).split('.');

    expect(verify(`${encodePayload({ u: 'user-b', c: ['alpha'] })}.${signature}`)).toBeUndefined();
    expect(verify(`${encodePayload({ u: 'user-a', c: ['beta'] })}.${signature}`)).toBeUndefined();
    expect(sign('user-a', ['alpha'])).not.toBe(sign('user-b', ['alpha']));
    expect(sign('user-a', ['alpha'])).not.toBe(sign('user-a', ['beta']));
  });

  it('refuses a token whose signature was altered', () => {
    const token = sign('user-a', ['alpha']);
    const last = token.at(-1) === 'A' ? 'B' : 'A';

    expect(verify(`${token.slice(0, -1)}${last}`)).toBeUndefined();
    expect(verify(`${token}A`)).toBeUndefined();
  });

  it('refuses a token signed with a key for another purpose or secret', () => {
    const otherPurpose = deriveUnsubscribeKey('a-server-secret-that-is-long-enough', 'other');
    const otherSecret = deriveUnsubscribeKey('another-server-secret-long-enough', 'test-purpose');
    const claims = { userId: 'user-a', categories: ['alpha' as const] };

    expect(verify(signUnsubscribeToken(otherPurpose, claims))).toBeUndefined();
    expect(verify(signUnsubscribeToken(otherSecret, claims))).toBeUndefined();
  });

  it('refuses malformed tokens', () => {
    const token = sign('user-a', ['alpha']);

    for (const malformed of ['', '.', 'abc', `${token}.extra`, token.replace('.', '')]) {
      expect(verify(malformed)).toBeUndefined();
    }
  });

  it('keeps the known categories of a token that also names a retired one', () => {
    const token = signUnsubscribeToken(key, {
      userId: 'user-a',
      categories: ['alpha', 'gamma' as Category],
    });

    expect(verify(token)).toEqual({ userId: 'user-a', categories: ['alpha'] });
  });

  it('refuses a correctly signed token whose claims are not a known shape', () => {
    const unknownCategory = signUnsubscribeToken(key, {
      userId: 'user-a',
      categories: ['gamma' as Category],
    });
    const noCategories = signUnsubscribeToken(key, { userId: 'user-a', categories: [] });
    const noUser = signUnsubscribeToken(key, { userId: '', categories: ['alpha'] });

    expect(verify(unknownCategory)).toBeUndefined();
    expect(verify(noCategories)).toBeUndefined();
    expect(verify(noUser)).toBeUndefined();
  });
});
