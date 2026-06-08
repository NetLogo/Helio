import type { Locator } from "playwright-core";
import { expect } from "vitest";

/**
 * Fill an input so the value survives Nuxt's SSR hydration.
 *
 * Right after navigation, Vue hydrates the server-rendered markup and re-renders
 * the inputs. If Playwright types into a field before hydration settles, the
 * re-render silently clears it — this reliably wiped the *first* field filled on
 * a freshly loaded page (e.g. "Name" on /signup, "Email" on /login), so the form
 * failed validation, never submitted, and `waitForURL` timed out. The result was
 * an intermittent failure that looked like a backend/CORS problem but was a
 * client-side race. Re-fill until the value sticks.
 */
export async function fillField(locator: Locator, value: string): Promise<void> {
  await locator.waitFor({ state: "visible" });
  await expect
    .poll(
      async () => {
        await locator.fill(value);
        return locator.inputValue();
      },
      { timeout: 10_000, interval: 150 },
    )
    .toBe(value);
}
