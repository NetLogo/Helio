import { describe, it, expect } from 'vitest';

import { newId } from '#src/shared/utils/id.ts';
import { validateRequestId } from '#src/shared/utils/validate-request-id.ts';

describe('validateRequestId', () => {
  it('accepts a NanoID', () => {
    expect(validateRequestId(newId())).toBe(true);
  });

  it('accepts a canonical UUID', () => {
    expect(validateRequestId('2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231')).toBe(true);
  });

  it('accepts an upper-case UUID', () => {
    expect(validateRequestId('2CDC8AB1-6D50-49CC-BA14-54E4AC7EC231')).toBe(true);
  });

  it('rejects undefined', () => {
    expect(validateRequestId(undefined)).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateRequestId('')).toBe(false);
  });

  it('rejects a malformed value', () => {
    expect(validateRequestId('not-a-real-id')).toBe(false);
  });

  it('rejects an over-long value', () => {
    expect(validateRequestId('a'.repeat(1000))).toBe(false);
  });
});
