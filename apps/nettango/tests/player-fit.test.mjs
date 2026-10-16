import assert from "node:assert/strict";
import { test } from "node:test";

import { fillHeight, fitHeight, fitScale, playerWidth } from "../app/utils/playerFit.ts";

// Catches a desktop pane getting a transform it does not need.
test("fitScale stays at 1 when the pane is at least as wide as the player", () => {
  assert.equal(fitScale(1440, 1140), 1);
  assert.equal(fitScale(1140, 1140), 1);
});

// Catches a narrow pane leaving the player scrolling sideways.
test("fitScale shrinks the player to the pane width", () => {
  assert.equal(fitScale(390, 1140), 390 / 1140);
  assert.equal(fitScale(550, 1100), 0.5);
});

// Catches a division by zero before the stage or the player has been measured.
test("fitScale treats an unmeasured pane or player as unscaled", () => {
  assert.equal(fitScale(0, 1140), 1);
  assert.equal(fitScale(390, 0), 1);
});

// Catches the wrapper keeping the unscaled height and leaving blank space under the player.
test("fitHeight is the player height after scaling", () => {
  assert.equal(fitHeight(700, 0.5), 350);
  assert.equal(fitHeight(700, 1), 700);
});

// Catches a scaled frame that no longer fills its pane.
test("fillHeight gives the frame height that fills the pane once scaled", () => {
  assert.equal(fillHeight(800, 0.5), 1600);
  assert.equal(fitHeight(fillHeight(844, 390 / 1140), 390 / 1140), 844);
});

// Catches the container margins being cut off when the frame is sized to the content alone.
test("playerWidth adds the content spill to the frame width", () => {
  assert.equal(playerWidth(390, { scrollWidth: 1124, clientWidth: 374 }), 1140);
  assert.equal(playerWidth(1440, { scrollWidth: 1424, clientWidth: 1424 }), 1440);
});
