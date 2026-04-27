import { setup as nuxtSetup } from "@nuxt/test-utils/e2e";

export const E2E_HOST = process.env.E2E_HOST;

type SetupOptions = Parameters<typeof nuxtSetup>[0];

export async function e2eSetup(extra: SetupOptions = {}) {
  return nuxtSetup({
    browser: true,
    browserOptions: { type: "chromium" },
    ...(E2E_HOST ? { host: E2E_HOST } : { server: true }),
    ...extra,
  });
}
