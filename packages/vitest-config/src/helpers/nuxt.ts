import { waitForHydration } from "@nuxt/test-utils/e2e";
import type { Page } from "playwright-core";

// Navigate and wait for hydration before returning, so fills and clicks land on
// a live Vue form instead of inert SSR markup (a known cause of flaky auth
// tests). Uses @nuxt/test-utils' own waitForHydration primitive.
export async function gotoHydrated(page: Page, target: string): Promise<void> {
  await page.goto(target);
  await waitForHydration(page, target, "hydration");
}
