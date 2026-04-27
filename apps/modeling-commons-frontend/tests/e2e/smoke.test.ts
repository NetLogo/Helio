// E2E smoke: each public page loads with a 200, renders a heading, and emits
// no console errors during navigation.

import { describe, expect, it } from "vitest";
import { createPage, url } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";

const PAGES: Array<{ path: string; heading: RegExp }> = [
  { path: "/", heading: /./ },
  { path: "/about", heading: /./ },
  { path: "/donate", heading: /./ },
  { path: "/models", heading: /Explore Models/i },
  { path: "/login", heading: /Log In|Welcome back/i },
  { path: "/signup", heading: /Sign Up/i },
];

describe("smoke: public pages", async () => {
  await e2eSetup();

  for (const { path, heading } of PAGES) {
    it(`loads ${path} with a 200, heading visible, no console errors`, async () => {
      const page = await createPage();
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`${path}: ${msg.text()}`);
      });
      page.on("pageerror", (err) => {
        errors.push(`${path} (pageerror): ${err.message}`);
      });

      const response = await page.goto(url(path), { waitUntil: "load" });
      expect(response, `no response for ${path}`).toBeTruthy();
      expect(response?.ok(), `non-2xx for ${path}`).toBe(true);

      // Either an h1 or any visible heading should appear.
      const headingLocator = page.locator("h1, h2, h3, h4, h5, h6").first();
      await headingLocator.waitFor({ timeout: 15_000 });
      const text = (await headingLocator.textContent()) ?? "";
      expect(text).toMatch(heading);

      expect(errors, `console errors on ${path}`).toEqual([]);

      await page.close();
    });
  }
});
