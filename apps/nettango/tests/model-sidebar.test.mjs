import assert from "node:assert/strict";
import { test } from "node:test";

import {
  gradeBandLabels,
  previewSource,
  resolveModels,
  sidebarHiddenFromQuery,
} from "../app/utils/modelSidebar.ts";

const models = [
  { id: "ants", title: "Ants" },
  { id: "slime", title: "Slime" },
  { id: "wolves", title: "Wolves" },
];

// Catches related cards rendered in gallery order instead of the curated order.
test("resolveModels keeps the order of the ids it is given", () => {
  assert.deepEqual(
    resolveModels(["wolves", "ants"], models).map(({ id }) => id),
    ["wolves", "ants"],
  );
});

// Catches a card linking to a model that is not in models.json, or to the page itself.
test("resolveModels drops unknown ids, duplicates and the excluded model", () => {
  assert.deepEqual(
    resolveModels(["slime", "missing", "ants", "slime"], models, "ants").map(({ id }) => id),
    ["slime"],
  );
});

const full = {
  id: "ants",
  thumbnail: "/t.webp",
  animatedThumbnail: "/a.gif",
  stepThumbnail: "/s.gif",
};

// Catches the preview showing the real time gif once the stepped gif exists.
test("previewSource prefers the stepped gif", () => {
  assert.equal(previewSource(full, false), "/s.gif");
});

// Catches an empty preview before the finisher fills stepThumbnail.
test("previewSource falls back to the animated gif, then the still", () => {
  assert.equal(previewSource({ ...full, stepThumbnail: undefined }, false), "/a.gif");
  assert.equal(previewSource({ id: "ants", thumbnail: "/t.webp" }, false), "/t.webp");
});

// Catches a gif playing for visitors who asked for reduced motion.
test("previewSource shows the still when motion is reduced", () => {
  assert.equal(previewSource(full, true), "/t.webp");
});

// Catches raw slugs like middle-school leaking into the page.
test("gradeBandLabels names each band in order", () => {
  assert.deepEqual(gradeBandLabels(["high-school", "elementary"]), [
    "High school",
    "Elementary school",
  ]);
});

// Catches a query parser that hides the panel on anything but the exact "hidden" value.
test("sidebarHiddenFromQuery hides the panel only for sidebar=hidden", () => {
  assert.equal(sidebarHiddenFromQuery("hidden"), true);
  assert.equal(sidebarHiddenFromQuery(["hidden", "open"]), true);
  assert.equal(sidebarHiddenFromQuery("open"), false);
  assert.equal(sidebarHiddenFromQuery(undefined), false);
  assert.equal(sidebarHiddenFromQuery(null), false);
  assert.equal(sidebarHiddenFromQuery(""), false);
  assert.equal(sidebarHiddenFromQuery("HIDDEN"), false);
  assert.equal(sidebarHiddenFromQuery("1"), false);
  assert.equal(sidebarHiddenFromQuery(["open", "hidden"]), false);
});
