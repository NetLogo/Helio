// E2E: browse /models, type a search keyword, navigate into a model card.
//
// Resilient to seed state: doesn't assert on a specific model existing.

import { describe, expect, it } from "vitest";
import { createPage, url } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";

describe("models: browse", async () => {
  await e2eSetup();

  it("renders the models page without console errors", async () => {
    const page = await createPage();
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const response = await page.goto(url("/models"));
    expect(response?.ok()).toBe(true);

    await page
      .getByRole("heading", { name: /Explore Models/i })
      .waitFor({ timeout: 15_000 });

    // Either at least one ModelCard renders, or the empty state shows up.
    await Promise.race([
      page.locator("a[href^='/models/']").first().waitFor({ timeout: 15_000 }),
      page.getByText(/No models found/i).waitFor({ timeout: 15_000 }),
    ]);

    expect(errors).toEqual([]);
    await page.close();
  });

  it("typing in the search bar updates the query and visible results", async () => {
    const page = await createPage();
    await page.goto(url("/models"));

    await page
      .getByRole("heading", { name: /Explore Models/i })
      .waitFor({ timeout: 15_000 });

    const initialCount = await page.locator("a[href^='/models/']").count();

    const searchInput = page.getByRole("textbox").first();
    await searchInput.fill("zzznoresultsexpected" + Date.now());

    // Debounced 300ms; wait for either fewer cards or the empty state.
    await expect
      .poll(
        async () => {
          const empty = await page.getByText(/No models found/i).isVisible();
          if (empty) return "empty";
          const count = await page.locator("a[href^='/models/']").count();
          return count < initialCount ? "smaller" : "same";
        },
        { timeout: 10_000 },
      )
      .not.toBe("same");

    await page.close();
  });

  it("clicking a model card navigates to its detail page", async () => {
    const page = await createPage();
    await page.goto(url("/models"));

    const firstCard = page.locator("a[href^='/models/']").first();
    const exists = await firstCard.count();
    if (!exists) {
      // Empty seed — there's nothing to click into. Skip rather than fail.
      await page.close();
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/models\/.+/, { timeout: 15_000 });

    // Header / hero region should render. Use the "Back to models" button as
    // a stable anchor — it appears at the top of the [id] page.
    await page
      .getByRole("link", { name: /Back to models/i })
      .waitFor({ timeout: 15_000 });

    await page.close();
  });
});
