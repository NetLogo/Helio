import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFadeRule() {
  const scss = fs.readFileSync(path.resolve(process.cwd(), "app/assets/styles/main.scss"), "utf8");
  const start = scss.indexOf(".gradient-boundary-scroll {");
  let depth = 0;
  for (let i = start; i < scss.length; i++) {
    if (scss[i] === "{") depth++;
    if (scss[i] === "}" && --depth === 0) return scss.slice(start, i + 1);
  }
  throw new Error("gradient-boundary-scroll rule not found");
}

// The fades were absolutely positioned against the dropdown, so they covered the
// footer link and whole rows instead of the scroll edges.
describe("scroll edge fade", () => {
  const rule = readFadeRule();

  it("pins the fades to the scroll container edges", () => {
    expect(rule).toMatch(/position:\s*sticky/);
    expect(rule).not.toMatch(/position:\s*absolute/);
  });

  it("fades into the theme background instead of white", () => {
    expect(rule).toContain("var(--ui-bg)");
    expect(rule).not.toMatch(/rgba\(255,\s*255,\s*255/);
  });
});
