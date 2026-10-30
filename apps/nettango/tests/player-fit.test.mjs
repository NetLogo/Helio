import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MIN_PLAYER_SCALE,
  fillHeight,
  fitPlayerParts,
} from "../app/utils/playerFit.ts";

// Catches a scaled frame that no longer fills its pane.
test("fillHeight gives the frame height that fills the pane once scaled", () => {
  assert.equal(fillHeight(800, 0.5), 1600);
  assert.equal(fillHeight(844, 390 / 1140) * (390 / 1140), 844);
});

// Measured from the exported players: ideal-gas-law sits side by side, ants is stacked already.
const idealGas = { widths: [1035, 932], sideBySide: true, chrome: 16 };
const ants = { widths: [875, 1124], sideBySide: false, chrome: 16 };

// Catches a player that fits being stretched, scaled or given a fixed width it does not need.
test("fitPlayerParts fills the pane when the whole row fits", () => {
  assert.deepEqual(fitPlayerParts(2100, idealGas), { width: 2100, scale: 1 });
  assert.deepEqual(fitPlayerParts(1200, ants), { width: 1200, scale: 1 });
});

// Catches a nearly fitting side by side player being stacked when a small shrink keeps it whole.
test("fitPlayerParts shrinks a side by side row that is only a little too wide", () => {
  const fit = fitPlayerParts(1800, idealGas);
  assert.equal(fit.width, 1983);
  assert.equal(fit.scale, 1800 / 1983);
});

// Catches the side by side row being scaled to half size instead of wrapping at full size.
test("fitPlayerParts stacks a side by side row that would need a large shrink", () => {
  assert.deepEqual(fitPlayerParts(1094, idealGas), { width: 1094, scale: 1 });
  const fit = fitPlayerParts(961, idealGas);
  assert.equal(fit.width, 1051);
  assert.equal(fit.scale, 961 / 1051);
});

// Catches a phone shrinking the player until it is unreadable.
test("fitPlayerParts never scales below the readable minimum", () => {
  assert.deepEqual(fitPlayerParts(390, ants), { width: 1140, scale: MIN_PLAYER_SCALE });
  assert.deepEqual(fitPlayerParts(390, idealGas), { width: 1051, scale: MIN_PLAYER_SCALE });
});

// Catches a division by zero before the stage has been measured.
test("fitPlayerParts leaves an unmeasured pane unscaled", () => {
  assert.equal(fitPlayerParts(0, idealGas).scale, 1);
});
