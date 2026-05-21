import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("passkey prompt page is client-only", () => {
  it("lives at passkey.client.vue (Nuxt's client-only file-naming convention)", () => {
    const clientFile = fileURLToPath(new URL("./passkey.client.vue", import.meta.url));
    const ssrFile = fileURLToPath(new URL("./passkey.vue", import.meta.url));
    expect(existsSync(clientFile)).toBe(true);
    expect(existsSync(ssrFile)).toBe(false);
  });
});
