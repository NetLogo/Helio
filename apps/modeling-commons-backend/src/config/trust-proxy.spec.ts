import { describe, expect, it } from 'vitest';
import { assertNoTrustProxyMaxHops } from '#src/config/trust-proxy.ts';

describe('assertNoTrustProxyMaxHops', () => {
  it('refuses to boot when the removed variable is still set', () => {
    expect(() => assertNoTrustProxyMaxHops('2')).toThrow('TRUST_PROXY_ADDRESSES');
  });

  it('refuses an empty value too', () => {
    expect(() => assertNoTrustProxyMaxHops('')).toThrow('TRUST_PROXY_MAX_HOPS');
  });

  it('passes when the variable is absent', () => {
    expect(() => assertNoTrustProxyMaxHops(undefined)).not.toThrow();
  });
});
