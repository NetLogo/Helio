import { setup as nuxtSetup } from "@nuxt/test-utils/e2e";

export const E2E_HOST = process.env.E2E_HOST;

type SetupOptions = Parameters<typeof nuxtSetup>[0];

// In server mode the setup hook builds Nuxt before the browser launches; a cold
// production build on a 2-core CI runner can exceed @nuxt/test-utils' 120s
// default and time out the whole suite. Host mode skips the build (build/server
// are forced off), so this only bites the local server-mode fallback — bump it
// generously and let CI override via env. CI should prefer host mode (E2E_HOST).
const SETUP_TIMEOUT = Number(process.env.E2E_SETUP_TIMEOUT ?? 300_000);

export async function e2eSetup(extra: SetupOptions = {}) {
  return nuxtSetup({
    browser: true,
    browserOptions: { type: "chromium" },
    setupTimeout: SETUP_TIMEOUT,
    ...(E2E_HOST ? { host: E2E_HOST } : { server: true }),
    ...extra,
  });
}
