import { createPage } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "@repo/vitest-config/helpers/smoke";
import { describe, expect, it } from "vitest";

const HOST = process.env["E2E_HOST"] ?? "http://localhost:3002";
const ARTICLE = "/articles/first-11-netlogo-primitives-to-learn";
// Must exceed the popover close-delay in PrimTooltip.vue: closing is time-based, so staying open can only be observed after it.
const LONGER_THAN_CLOSE_DELAY_MS = 600;

describe("primitive popover", async () => {
  await e2eSetup(HOST);

  // Catches a details card that closes while the pointer travels from the primitive into it (reka-ui 2.11 tooltip grace area).
  it("stays open while the pointer moves into the card and closes after leaving", async () => {
    const page = await createPage(ARTICLE);
    const trigger = page.locator("code.netlogo-command[data-state]").first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.hover();

    const card = page.locator(".primitive-tooltip-content").first();
    await card.waitFor({ state: "visible" });

    const t = await trigger.boundingBox();
    const c = await card.boundingBox();
    expect(t && c).toBeTruthy();
    await page.mouse.move(c!.x + c!.width / 2, c!.y + c!.height / 2, { steps: 20 });
    await page.waitForTimeout(LONGER_THAN_CLOSE_DELAY_MS);
    expect(await card.isVisible()).toBe(true);

    await page.mouse.move(t!.x, t!.y + 400, { steps: 5 });
    await card.waitFor({ state: "hidden" });
    await page.close();
  });
});
