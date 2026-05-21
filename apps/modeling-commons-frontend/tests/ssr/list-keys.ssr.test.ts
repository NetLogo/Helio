import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

describe("Index-as-key removal in reorderable lists", () => {
  it("UserHeader keys SocialLink iterations by a stable id", () => {
    const src = read("app/components/user/UserHeader.vue");
    expect(src).not.toMatch(/:key="index"/);
    expect(src).toMatch(/:key="`\$\{link\.type\}/);
  });

  it("SocialLinksInput keys link rows by a stable id", () => {
    const src = read("app/components/shared/SocialLinksInput.vue");
    expect(src).not.toMatch(/:key="index"/);
    expect(src).toMatch(/:key="`\$\{link\.type\}/);
  });
});
