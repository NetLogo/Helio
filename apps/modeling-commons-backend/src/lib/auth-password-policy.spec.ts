import { describe, expect, it } from 'vitest';
import { assertPasswordMeetsComplexity } from '#src/lib/auth-password-policy.ts';

describe('assertPasswordMeetsComplexity', () => {
  it('accepts a letter, a number and a special character without an uppercase letter', () => {
    expect(() => assertPasswordMeetsComplexity('lowercase1!')).not.toThrow();
  });

  it('refuses a password without a number', () => {
    expect(() => assertPasswordMeetsComplexity('NoNumber!')).toThrow('at least one number');
  });

  it('refuses a password with a space', () => {
    expect(() => assertPasswordMeetsComplexity('has space1!')).toThrow('no spaces');
  });
});
