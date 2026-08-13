// E2E smoke: each public page loads with a 200, resolves to the right page
// (by heading or document title), and emits no console errors during navigation.

import { describe, expect, it } from "vitest";
import { createPage, url } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";
import { expectPageIdentity } from "./helpers/page";

const PAGES: Array<{ path: string; identity: RegExp }> = [
  { path: "/", identity: /./ },
  { path: "/about", identity: /./ },
  { path: "/donate", identity: /./ },
  { path: "/models", identity: /Explore Models/i },
  { path: "/featured-models", identity: /Featured Models/i },
  { path: "/new-models", identity: /New Models/i },
  { path: "/tags", identity: /Models by Tag/i },
  { path: "/login", identity: /Log In|Welcome back/i },
  { path: "/signup", identity: /Sign Up/i },
  { path: "/reset-password", identity: /Reset password/i },
  // { path: "/privacy", identity: /Privacy Policy/i },
  // { path: "/terms-of-service", identity: /Terms of Service/i },
  // { path: "/cookies", identity: /Cookie Policy/i },
];

describe("smoke: public pages", async () => {
  await e2eSetup();

  for (const { path, identity } of PAGES) {
    it(`loads ${path} with a 200, correct page, no console errors`, async () => {
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

      await expectPageIdentity(page, identity, path);

      const title = await page.title();
      expect(title.trim(), `empty <title> on ${path}`).not.toBe("");

      expect(errors, `console errors on ${path}`).toEqual([]);

      await page.close();
    });
  }
});
