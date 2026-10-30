import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clampRatio,
  getRatioForKey,
  getRatioFromPointer,
  shouldCollapseStart,
  parseSplitQuery,
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
test("getRatioFromPointer measures the start pane from its own edge", () => {
  assert.equal(getRatioFromPointer(600, 100, 1000), 50);
  assert.equal(getRatioFromPointer(300, 100, 1000), 20);
  assert.equal(getRatioFromPointer(300, 100, 1000, true), 80);
});

// Catches the sidebar closing during an ordinary resize, or never closing at the edge.
test("shouldCollapseStart fires only once the pointer is halfway past the minimum", () => {
  assert.equal(shouldCollapseStart(20, 1440, 280), false);
  assert.equal(shouldCollapseStart(10, 1440, 280), false);
  assert.equal(shouldCollapseStart(9.5, 1440, 280), true);
  assert.equal(shouldCollapseStart(-3, 1440, 280), true);
});

// Catches an unmeasured container collapsing the pane on the first pointer move.
test("shouldCollapseStart never fires before the container is measured", () => {
  assert.equal(shouldCollapseStart(0, 0, 280), false);
});

// Catches arrow keys moving the divider the wrong way, before or after a swap.
test("getRatioForKey moves the divider with the arrow keys and jumps on Home and End", () => {
  assert.equal(getRatioForKey(50, "ArrowLeft"), 48);
  assert.equal(getRatioForKey(50, "ArrowRight"), 52);
  assert.equal(getRatioForKey(50, "ArrowLeft", true), 52);
  assert.equal(getRatioForKey(50, "Home"), 20);
  assert.equal(getRatioForKey(50, "End"), 80);
  assert.equal(getRatioForKey(50, "Enter"), undefined);
});

// Catches garbage or out of range ?split= values reaching the layout.
test("parseSplitQuery accepts integers from 30 to 70 only", () => {
  assert.equal(parseSplitQuery("40"), 40);
  assert.equal(parseSplitQuery(["70", "20"]), 70);
  for (const bad of ["29", "71", "4e1", "40.5", " 40", "", "abc", undefined, null, 40]) {
    assert.equal(parseSplitQuery(bad), undefined, String(bad));
  }
});
