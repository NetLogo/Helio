import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { OG_COLORS } from "../app/components/OgImage/tokens.ts";

const MIRRORED_PROPERTIES = {
  wall: "--color-wall",
  screen: "--color-screen-glow",
  screenEdge: "--color-screen-glow-edge",
  blue: "--color-nt-blue-500",
  blockRed: "--color-block-red",
  ink: "--ui-text",
  inkToned: "--ui-text-toned",
};

const css = readFileSync(new URL("../app/assets/styles/tailwind.css", import.meta.url), "utf8");

const expandHex = (hex) =>
  hex.length === 4 ? `#${[...hex.slice(1)].map((digit) => digit + digit).join("")}` : hex.toLowerCase();

const getPropertyValue = (name) => {
  const match = css.match(new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{3,6});`, "m"));
  return match ? expandHex(match[1]) : undefined;
};

// Catches an Open Graph colour added without a theme token to mirror.
test("every Open Graph colour names the theme token it mirrors", () => {
  assert.deepEqual(Object.keys(OG_COLORS).sort(), Object.keys(MIRRORED_PROPERTIES).sort());
});

// Catches the theme changing in tailwind.css while the Open Graph images keep the old colours.
test("Open Graph colours equal their theme tokens", () => {
  for (const [key, property] of Object.entries(MIRRORED_PROPERTIES)) {
    assert.equal(OG_COLORS[key], getPropertyValue(property), `${key} mirrors ${property}`);
  }
});
