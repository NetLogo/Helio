export type EnvLike = Record<string, string | undefined>;

export function getCdnUrl(env: EnvLike): string {
  return env.NUXT_PUBLIC_CDN_URL ?? "";
}

export function getImageDomains(env: EnvLike): string[] {
  const candidates = [
    env.NUXT_PUBLIC_CDN_URL,
    env.NUXT_STORAGE_BASE_URL,
    env.NUXT_PUBLIC_APP_URL,
    env.NUXT_PUBLIC_API_BASE,
    env.NUXT_PUBLIC_AUTH_BASE,
  ];

  const origins = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // Skip malformed entries; nothing to allowlist.
    }
  }
  return [...origins];
}

export function getImgSrcAllowlist(env: EnvLike): string[] {
  return ["'self'", "data:", "blob:", ...getImageDomains(env)];
}

export function getConnectSrcAllowlist(env: EnvLike): string[] {
  const extras = [
    env.NUXT_PUBLIC_CDN_URL,
    env.NUXT_PUBLIC_API_BASE,
    env.NUXT_PUBLIC_AUTH_BASE,
    env.NUXT_PUBLIC_NETLOGO_WEB_URL,
  ];
  const origins = new Set<string>(["'self'"]);
  for (const candidate of extras) {
    if (!candidate) continue;
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // Skip malformed entries; nothing to allowlist.
    }
  }
  return [...origins];
}
