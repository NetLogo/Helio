// E2E: switch between Discussion / Files / Versions / Family tabs and
// toggle the like button on a model.
//
// Notes for source-side maintainers:
// - Tab buttons in `ModelDetail.vue` are unlabelled `<button>`s in a flex
//   container. They have no `role="tab"`. We locate them by visible text.
//   Adding `role="tab"` plus an aria-controls/data-testid would make this
//   journey more robust.
// - The like button in `ModelBottomBar.vue` (via `ModelLike.vue`) is a UButton with text "Like" /
//   "Liked". Locating it by accessible name works today.
// - This test signs up a fresh user and tries to like — but liking requires a
//   verified, signed-in user, so the like persistence assertion is left as
//   `it.todo` until backend test-token retrieval lands.

import { describe, expect, it } from "vitest";
import { createPage, url } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";
import { modelCardLink } from "./helpers/page";

describe("model detail: tabs and likes", async () => {
  await e2eSetup();

  it("can switch between the four tabs on a model detail page", async () => {
    const page = await createPage();
    await page.goto(url("/models"));

    const firstCard = page.locator(modelCardLink).first();
    if (!(await firstCard.count())) {
      await page.close();
      return; // empty seed; nothing to test
    }
    await firstCard.click();
    await page.waitForURL(/\/models\/.+/);

    // Tabs are buttons containing the labels.
    const discussion = page.getByRole("button", { name: /^Discussion$/ });
    const files = page.getByRole("button", { name: /^Files$/ });
    const versions = page.getByRole("button", { name: /^Versions/ });
    const family = page.getByRole("button", { name: /^Family$/ });

    await discussion.waitFor({ timeout: 15_000 });

    await files.click();
    await expect
      .poll(() => files.evaluate((el) => el.className), { timeout: 5_000 })
      .toContain("border-primary");

    await versions.click();
    await expect
      .poll(() => versions.evaluate((el) => el.className), { timeout: 5_000 })
      .toContain("border-primary");

    await family.click();
    await expect
      .poll(() => family.evaluate((el) => el.className), { timeout: 5_000 })
      .toContain("border-primary");

    await discussion.click();
    await expect
      .poll(() => discussion.evaluate((el) => el.className), { timeout: 5_000 })
      .toContain("border-primary");

    await page.close();
  });

  it.todo(
    "like button toggles and persists across reload (needs a verified signed-in user)",
  );
});
