import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = fs.readFileSync(path.resolve(process.cwd(), "nuxt.config.ts"), "utf8");

const publicBlock = (() => {
  const idx = src.indexOf("runtimeConfig:");
  const close = src.indexOf("turnstile:", idx);
  return src.slice(idx, close);
})();

describe("runtimeConfig.public hygiene", () => {
  it("does not expose adminDashboardUrl", () => {
    expect(publicBlock).not.toContain("adminDashboardUrl");
  });

  it("does not expose the unused storageBaseUrl key", () => {
    expect(publicBlock).not.toContain("storageBaseUrl");
  });

  it("does not expose any *secret*/*token* keys in public", () => {
    expect(publicBlock.toLowerCase()).not.toMatch(/secret|token|password|privatekey/);
  });

  it("keeps the in-use public keys (apiBase, authApiBase, appUrl, cdnUrl)", () => {
    for (const key of ["apiBase", "authApiBase", "appUrl", "cdnUrl"]) {
      expect(publicBlock).toContain(key);
    }
  });
});
