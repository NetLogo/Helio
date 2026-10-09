import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCode } from "../scripts/models/check.mjs";
import { findOverlaps, reflow, reflowCode } from "../scripts/models/reflow.mjs";
import { readWidgets } from "../scripts/models/widgets.mjs";

const VIEW =
  '<view x="0" y="10" width="528" height="337" minPxcor="-32" maxPxcor="32" minPycor="-20" maxPycor="20" patchSize="8"/>';

const widget = (type, x, y, width, height, extra = "", body = "") =>
  `<${type} x="${x}" y="${y}" width="${width}" height="${height}"${extra}>${body}</${type}>`;

const model = (...widgets) =>
  `<?xml version="1.0" encoding="utf-8"?><model version="NetLogo 7.0.4">
  <code><![CDATA[to setup end]]></code>
  <widgets>
    ${widgets.join("\n    ")}
  </widgets>
</model>`;

const placed = (code) => {
  const { widgets } = reflow(readWidgets(code));
  return Object.fromEntries(widgets.map((w) => [w.label || w.type, [w.x, w.y, w.width, w.height]]));
};

test("reflow sets NetLogo 7 heights and minimum widths per type", () => {
  // Catches a wrong height table or widths shrinking below the template.
  const layout = placed(
    model(
      VIEW,
      widget("button", 600, 300, 60, 33, ' sizeVersion="0"', "setup"),
      widget("slider", 600, 340, 190, 33, ' variable="speed"'),
      widget("switch", 600, 380, 100, 33, ' variable="trails?"'),
      widget("chooser", 600, 420, 190, 45, ' variable="mode"'),
      widget("input", 600, 470, 100, 40, ' variable="seed"'),
      widget("monitor", 600, 520, 80, 45, ' display="count"'),
      widget("plot", 600, 570, 385, 290, ' display="Population"'),
    ),
  );
  assert.deepEqual(layout.setup.slice(2), [95, 40]);
  assert.deepEqual(layout.speed.slice(2), [220, 50]);
  assert.deepEqual(layout["trails?"].slice(2), [115, 40]);
  assert.deepEqual(layout.mode.slice(2), [220, 60]);
  assert.deepEqual(layout.seed.slice(2), [220, 60]);
  assert.deepEqual(layout.count.slice(2), [100, 60]);
  assert.deepEqual(layout.Population.slice(2), [340, 235]);
});

test("reflow keeps a wider original width on the grid and within the column", () => {
  // Catches clipping long button labels, off-grid widths, or widgets wider than the column.
  const layout = placed(
    model(
      VIEW,
      widget("button", 10, 10, 131, 33, ' display="clear drawing"'),
      widget("slider", 10, 50, 400, 33, ' variable="wide"'),
    ),
  );
  assert.equal(layout["clear drawing"][2], 135);
  assert.equal(layout.wide[2], 340);
});

test("reflow keeps multiline inputs, vertical sliders and notes at their own size", () => {
  // Catches forcing a fixed height onto widgets whose height follows their content.
  const layout = placed(
    model(
      VIEW,
      widget("input", 10, 10, 170, 165, ' variable="script" multiline="true"'),
      widget("slider", 10, 200, 33, 150, ' variable="level" direction="Vertical"'),
      widget("note", 10, 400, 150, 60, "", "Two line note"),
    ),
  );
  assert.deepEqual(layout.script.slice(2), [170, 165]);
  assert.deepEqual(layout.level.slice(2), [33, 150]);
  assert.deepEqual(layout["Two line note"].slice(2), [150, 60]);
});

test("reflow stacks settings above the buttons, the button row, then later settings", () => {
  // Catches losing the setup-only versus run-time order the author gave the settings.
  const layout = placed(
    model(
      VIEW,
      widget("slider", 30, 140, 190, 33, ' variable="later"'),
      widget("button", 136, 71, 75, 33, ' display="go"'),
      widget("button", 46, 71, 80, 33, ' display="setup"'),
      widget("slider", 30, 36, 190, 33, ' variable="first"'),
    ),
  );
  assert.deepEqual(layout.first, [5, 10, 220, 50]);
  assert.deepEqual(layout.setup, [5, 65, 95, 40]);
  assert.deepEqual(layout.go, [105, 65, 95, 40]);
  assert.deepEqual(layout.later, [5, 110, 220, 50]);
});

test("reflow wraps buttons and monitors after three per row and pairs switches", () => {
  // Catches rows running past the column, which would push widgets under the view.
  const buttons = ["a", "b", "c", "d"].map((name, i) =>
    widget("button", 10 + i * 80, 10, 70, 33, ` display="${name}"`),
  );
  const switches = ["s1?", "s2?", "s3?"].map((name, i) =>
    widget("switch", 10, 60 + i * 35, 100, 33, ` variable="${name}"`),
  );
  const monitors = ["m1", "m2", "m3", "m4"].map((name, i) =>
    widget("monitor", 10 + i * 90, 200, 80, 45, ` display="${name}"`),
  );
  const layout = placed(model(VIEW, ...buttons, ...switches, ...monitors));
  assert.deepEqual(
    [layout.a, layout.c, layout.d].map(([x, y]) => [x, y]),
    [
      [5, 10],
      [205, 10],
      [5, 55],
    ],
  );
  assert.deepEqual(
    [layout["s1?"], layout["s2?"], layout["s3?"]].map(([x, y]) => [x, y]),
    [
      [5, 100],
      [125, 100],
      [5, 145],
    ],
  );
  assert.deepEqual(
    [layout.m1, layout.m3, layout.m4].map(([x, y]) => [x, y]),
    [
      [5, 190],
      [215, 190],
      [5, 255],
    ],
  );
});

test("reflow puts the view right of the column at its derived size", () => {
  // Catches keeping the oversized view or leaving it at the left edge over the controls.
  const layout = placed(
    model(
      VIEW,
      widget("plot", 565, 10, 385, 290, ' display="P"'),
      widget("button", 565, 315, 80, 33, ' display="setup"'),
    ),
  );
  assert.deepEqual(layout.view, [355, 10, 524, 332]);
});

test("reflow warns about a non-round patch size and an interface over 1024x768", () => {
  // Catches the two template failures that need a hand layout passing silently.
  const view = (patchSize) =>
    `<view x="0" y="0" width="900" height="370" minPxcor="-125" maxPxcor="125" minPycor="-50" maxPycor="50" patchSize="${patchSize}"/>`;
  const setup = widget("button", 5, 5, 70, 34, ' display="setup"');
  assert.deepEqual(reflow(readWidgets(model(view("3.5"), setup))).warnings, [
    "patch size 3.5 is not round",
  ]);
  assert.deepEqual(reflow(readWidgets(model(view("4"), setup))).warnings, [
    "interface 1118x418 does not fit 1024x768",
  ]);
});

test("reflow output has no overlaps and drops sizeVersion", () => {
  // Catches a placement that stacks two widgets on the same rows or keeps the pre-7 opt-out.
  const code = model(
    VIEW,
    widget("button", 655, 315, 77, 33, ' display="go" sizeVersion="0"'),
    widget("button", 565, 315, 80, 33, ' display="setup" sizeVersion="0"'),
    widget("plot", 565, 10, 385, 290, ' display="P" sizeVersion="0"'),
    widget("note", 415, 350, 115, 18, "", "Powered by NetLogo"),
  );
  const result = reflowCode(code);
  assert.deepEqual(result.overlaps, []);
  assert.doesNotMatch(result.code, /sizeVersion/);
  assert.deepEqual(checkCode(result.code), []);
});

test("findOverlaps reports intersecting widgets but not touching ones", () => {
  // Catches an off-by-one that flags every stacked pair or misses a real overlap.
  const a = { x: 0, y: 0, width: 100, height: 40 };
  const touching = { x: 0, y: 40, width: 100, height: 40 };
  const crossing = { x: 50, y: 30, width: 100, height: 40 };
  assert.deepEqual(findOverlaps([a, touching]), []);
  assert.deepEqual(findOverlaps([a, touching, crossing]), [
    [a, crossing],
    [touching, crossing],
  ]);
});

test("reflowCode refuses legacy code and models without a view", () => {
  // Catches the legacy re-layout writing nlogox-only geometry into .nlogo sections.
  assert.throws(() => reflowCode("to go end\n@#$#@#$#@\nBUTTON\n1\n2\n3\n4\n"), /convert\.mjs/);
  assert.throws(() => reflowCode(model(widget("button", 5, 5, 70, 34))), /no view/);
});

test("reflow refuses widget types it cannot place", () => {
  // Catches an unknown widget being dropped from the layout and left where it was.
  assert.throws(
    () => reflow(readWidgets(model(VIEW, widget("gizmo", 5, 5, 10, 10)))),
    /unsupported widget types: gizmo/,
  );
});
