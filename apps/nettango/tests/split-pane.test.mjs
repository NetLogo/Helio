import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clampRatio,
  splitBootScript,
  splitCssVar,
  parseStoredRatio,
  ratioForKey,
  ratioFromPointer,
  resolveInitialRatio,
  splitFromQuery,
} from "../app/utils/splitPane.ts";

// Catches a drag past the edge collapsing a pane to nothing.
test("clampRatio keeps the ratio inside the global bounds", () => {
  assert.equal(clampRatio(5), 20);
  assert.equal(clampRatio(95), 80);
  assert.equal(clampRatio(55.55), 55.6);
});

// Catches the minimum pane widths being ignored on a narrow window.
test("clampRatio honours the minimum pane widths for the container width", () => {
  assert.equal(clampRatio(20, 1000, 320, 280), 32);
  assert.equal(clampRatio(80, 1000, 320, 280), 72);
});

// Catches one pane taking everything when both minimums cannot fit.
test("clampRatio splits the shortfall when the container is too narrow", () => {
  assert.equal(clampRatio(70, 500, 320, 280), 54);
});

// Catches the divider moving opposite to the pointer once the panes are swapped.
test("ratioFromPointer measures the start pane from its own edge", () => {
  assert.equal(ratioFromPointer(600, 100, 1000), 50);
  assert.equal(ratioFromPointer(300, 100, 1000), 20);
  assert.equal(ratioFromPointer(300, 100, 1000, true), 80);
});

// Catches arrow keys moving the divider the wrong way, before or after a swap.
test("ratioForKey moves the divider with the arrow keys and jumps on Home and End", () => {
  assert.equal(ratioForKey(50, "ArrowLeft"), 48);
  assert.equal(ratioForKey(50, "ArrowRight"), 52);
  assert.equal(ratioForKey(50, "ArrowLeft", true), 52);
  assert.equal(ratioForKey(50, "Home"), 20);
  assert.equal(ratioForKey(50, "End"), 80);
  assert.equal(ratioForKey(50, "Enter"), undefined);
});

// Catches garbage or out of range ?split= values reaching the layout.
test("splitFromQuery accepts integers from 30 to 70 only", () => {
  assert.equal(splitFromQuery("40"), 40);
  assert.equal(splitFromQuery(["70", "20"]), 70);
  for (const bad of ["29", "71", "4e1", "40.5", " 40", "", "abc", undefined, null, 40]) {
    assert.equal(splitFromQuery(bad), undefined, String(bad));
  }
});

// Catches a tampered or stale localStorage value breaking the layout.
test("parseStoredRatio rejects values outside the bounds or not numeric", () => {
  assert.equal(parseStoredRatio("62"), 62);
  assert.equal(parseStoredRatio("45.5"), 45.5);
  for (const bad of [null, "", "10", "90", "NaN", "50px", "1e1", "-50"]) {
    assert.equal(parseStoredRatio(bad), undefined, String(bad));
  }
});

// Catches the stored ratio overriding an explicit ?split=, or garbage beating the fallback.
test("resolveInitialRatio prefers explicit, then a valid stored value, then the fallback", () => {
  assert.equal(resolveInitialRatio(40, "60", 64), 40);
  assert.equal(resolveInitialRatio(undefined, "60", 64), 60);
  assert.equal(resolveInitialRatio(undefined, "junk", 64), 64);
});

const runBootScript = (key, stored) => {
  const set = new Map();
  const localStorage = {
    getItem: () => {
      if (stored instanceof Error) throw stored;
      return stored;
    },
  };
  const document = { documentElement: { style: { setProperty: (name, value) => set.set(name, value) } } };
  new Function("localStorage", "document", splitBootScript(key))(localStorage, document);
  return Object.fromEntries(set);
};

// Catches the pre-paint script missing the saved ratio, which makes the panes jump after hydration.
test("splitBootScript sets the CSS variable from a valid stored ratio", () => {
  assert.deepEqual(runBootScript("model-app-view", "50.5"), { "--nt-split-model-app-view": "50.5%" });
});

// Catches the pre-paint script trusting a tampered value or crashing when storage is blocked.
test("splitBootScript ignores invalid values and blocked storage", () => {
  for (const bad of [null, "10", "90", "50px", "1e1"]) {
    assert.deepEqual(runBootScript("model-app-view", bad), {}, String(bad));
  }
  assert.deepEqual(runBootScript("model-app-view", new Error("SecurityError")), {});
});

// Catches a storage key injecting characters into the CSS variable name.
test("splitCssVar keeps only safe characters from the storage key", () => {
  assert.equal(splitCssVar('a"b;c-1'), "--nt-split-abc-1");
});
