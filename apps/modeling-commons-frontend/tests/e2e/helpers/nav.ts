import type { Page } from "playwright-core";
import { url, waitForHydration } from "@nuxt/test-utils/e2e";

// Navigate and wait for hydration before returning, so fills and clicks land on
// a live Vue form instead of inert SSR markup (a known cause of flaky auth
// tests). Uses @nuxt/test-utils' own waitForHydration primitive.
export async function gotoHydrated(page: Page, path: string): Promise<void> {
  const target = url(path);
  await page.goto(target);
  await waitForHydration(page, target, "hydration");
}
