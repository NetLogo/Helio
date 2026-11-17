export const assertNoTrustProxyMaxHops = (maxHops: string | undefined) => {
  if (maxHops === undefined) return;
  throw new Error(
    'TRUST_PROXY_MAX_HOPS was removed; list the trusted proxy IPs or CIDRs in TRUST_PROXY_ADDRESSES',
  );
};
