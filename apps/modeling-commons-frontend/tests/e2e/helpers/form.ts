import type { Locator } from "playwright-core";
import { expect } from "vitest";

/**
 * Fill an input, re-filling until the value sticks.
 *
 * Navigate with `gotoHydrated` first so the field is interactive; this only
 * guards against a transient re-render flushing the value mid-fill.
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
