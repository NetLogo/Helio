import { setup as nuxtSetup } from "@nuxt/test-utils/e2e";

export const E2E_HOST = process.env.E2E_HOST;

type SetupOptions = Parameters<typeof nuxtSetup>[0];

// In server mode the setup hook builds Nuxt before the browser launches; a cold
// production build on a 2-core CI runner can exceed @nuxt/test-utils' 120s
// default and time out the whole suite. Host mode skips the build (build/server
// are forced off), so this only bites the local server-mode fallback — bump it
// generously and let CI override via env. CI should prefer host mode (E2E_HOST).
const SETUP_TIMEOUT = Number(process.env.E2E_SETUP_TIMEOUT ?? 300_000);

// In server mode, pin the built test server to the same port the app's
// `NUXT_PUBLIC_APP_URL` (and the backend's `ALLOWED_ORIGINS`) expect, so the
// email verification `callbackURL` resolves back to the test server instead of
// a dead random port.
const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 3005);

// @nuxt/test-utils binds the server to 127.0.0.1, but the Better Auth session
// cookie is host-scoped to `localhost` (the backend at localhost:3000 sets it),
// so navigating via 127.0.0.1 silently drops the session. Resolve app URLs
// against `localhost` (the same socket) to keep the session across SSR loads.
export const APP_ORIGIN = E2E_HOST ?? `http://localhost:${SERVER_PORT}`;

export function appUrl(path: string): string {
  return new URL(path, APP_ORIGIN).toString();
}

export async function e2eSetup(extra: SetupOptions = {}) {
  return nuxtSetup({
    browser: true,
    browserOptions: { type: "chromium" },
    setupTimeout: SETUP_TIMEOUT,
    ...(E2E_HOST ? { host: E2E_HOST } : { server: true, port: SERVER_PORT }),
    ...extra,
  });
}
