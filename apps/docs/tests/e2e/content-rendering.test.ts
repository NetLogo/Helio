import { createPage } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "@repo/vitest-config/helpers/smoke";
import { describe, expect, it } from "vitest";

const HOST = process.env["E2E_HOST"] ?? "http://localhost:3001";

// Catches markdown being rendered by another library's Prose components (@nuxt/ui 4.12 replaced the plain mdc ones),
// which restyled every content page because the docs styles target this markup.
describe("content rendering", async () => {
  await e2eSetup(HOST);

  it("renders inline code as plain <code> elements", async () => {
    const page = await createPage("/matrix");
    const styledInlineCode = await page.locator(".prose p code[class]:not(.netlogo-command)").count();
    expect(await page.locator(".prose p code").count()).toBeGreaterThan(0);
    expect(styledInlineCode).toBe(0);
    await page.close();
  });
});
