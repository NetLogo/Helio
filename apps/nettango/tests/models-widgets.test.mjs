import assert from "node:assert/strict";
import { test } from "node:test";

import { formatOf, readWidgets, setRootVersion, writeWidgets } from "../scripts/models/widgets.mjs";

const NLOGOX = `<?xml version="1.0" encoding="utf-8"?><model version="NetLogo 7.0.4" nlw-version="2.16.0">
  <code><![CDATA[to go if 1 < 2 [ show "<widgets>" ] end]]></code>
  <widgets>
    <view x="0" y="10" width="528" height="337" minPxcor="-32" maxPxcor="32" minPycor="-20" maxPycor="20" patchSize="8"/>
    <button x="655" y="315" height="33" forever="true" display="go" width="77" sizeVersion="0">go</button>
    <plot x="565" y="10" height="290" display="Wolves &amp; Sheep" width="385" sizeVersion="0">
      <setup/>
      <pen display="wolves"><setup/><update><![CDATA[if count wolves > 0 [ plot 1 ]]]></update></pen>
    </plot>
    <monitor x="15" y="225" height="45" width="115"><![CDATA[count turtles with [ size < 2 ]]]></monitor>
    <chooser x="5" y="100" height="45" variable="mode" width="190"><choice type="string" value="a"></choice></chooser>
    <note x="415" y="350" height="18" width="115">Powered by NetLogo</note>
  </widgets>
  <info>none</info>
</model>`;

const LEGACY = `to go end
@#$#@#$#@
GRAPHICS-WINDOW
257
10
754
507
-1
-1
7.0

BUTTON
46
71
126
104
NIL
setup
NIL
1

SLIDER
31
36
221
69
population
population
0.0
200.0
125.0
1.0
1
NIL
HORIZONTAL

@#$#@#$#@
## WHAT IS IT?
`;

test("formatOf tells nlogox from legacy", () => {
  // Catches a detector that keys on file names or on '<' anywhere in legacy code.
  assert.equal(formatOf(NLOGOX), "nlogox");
  assert.equal(formatOf(LEGACY), "legacy");
  assert.equal(formatOf("to go if 1 < 2 [ ] end\n@#$#@#$#@"), "legacy");
});

test("readWidgets returns top-level nlogox widgets with geometry and labels", () => {
  // Catches nested pens or choices being read as widgets, and CDATA '<' breaking the scan.
  const widgets = readWidgets(NLOGOX);
  assert.deepEqual(
    widgets.map((w) => [w.type, w.x, w.y, w.width, w.height, w.sizeVersion, w.label]),
    [
      ["view", 0, 10, 528, 337, null, ""],
      ["button", 655, 315, 77, 33, 0, "go"],
      ["plot", 565, 10, 385, 290, 0, "Wolves & Sheep"],
      ["monitor", 15, 225, 115, 45, null, "count turtles with [ size < 2 ]"],
      ["chooser", 5, 100, 190, 45, null, "mode"],
      ["note", 415, 350, 115, 18, null, "Powered by NetLogo"],
    ],
  );
});

test("readWidgets throws on nlogox without a widgets element", () => {
  // Catches silently returning an empty list for a model the pipeline cannot lay out.
  assert.throws(
    () => readWidgets('<model version="NetLogo 7.0.4"><code/></model>'),
    /no <widgets>/,
  );
});

test("readWidgets reads legacy left, top, right, bottom as x, y, width, height", () => {
  // Catches treating legacy right and bottom as width and height.
  const widgets = readWidgets(LEGACY);
  assert.deepEqual(
    widgets.map((w) => [w.type, w.x, w.y, w.width, w.height, w.label]),
    [
      ["view", 257, 10, 497, 497, ""],
      ["button", 46, 71, 80, 33, "setup"],
      ["slider", 31, 36, 190, 33, "population"],
    ],
  );
});

test("readWidgets throws on text with no legacy sections", () => {
  // Catches parsing arbitrary text as a model with zero widgets.
  assert.throws(() => readWidgets("to go end"), /no section separators/);
});

test("writeWidgets is the identity when nothing changes", () => {
  // Catches a writer that reformats tags or legacy blocks it was not asked to touch.
  assert.equal(writeWidgets(NLOGOX, readWidgets(NLOGOX)), NLOGOX);
  assert.equal(writeWidgets(LEGACY, readWidgets(LEGACY)), LEGACY);
});

test("writeWidgets changes only nlogox geometry and drops a cleared sizeVersion", () => {
  // Catches edits leaking into element bodies, other attributes, or a stale sizeVersion.
  const widgets = readWidgets(NLOGOX).map((w) =>
    w.type === "button" ? { ...w, x: 105, y: 10, width: 95, height: 40, sizeVersion: null } : w,
  );
  const written = writeWidgets(NLOGOX, widgets);
  assert.match(
    written,
    /<button x="105" y="10" height="40" forever="true" display="go" width="95">go<\/button>/,
  );
  assert.equal(written.replace(/<button[^>]*>/, ""), NLOGOX.replace(/<button[^>]*>/, ""));
  const [, button] = readWidgets(written);
  assert.deepEqual(
    [button.x, button.y, button.width, button.height, button.sizeVersion],
    [105, 10, 95, 40, null],
  );
});

test("writeWidgets rewrites legacy corner lines from x, y, width, height", () => {
  // Catches writing width into the right line instead of x + width.
  const widgets = readWidgets(LEGACY).map((w) =>
    w.type === "slider" ? { ...w, x: 5, y: 10, width: 220, height: 50 } : w,
  );
  const written = writeWidgets(LEGACY, widgets);
  assert.match(written, /SLIDER\n5\n10\n225\n60\npopulation/);
  const slider = readWidgets(written).find((w) => w.type === "slider");
  assert.deepEqual([slider.x, slider.y, slider.width, slider.height], [5, 10, 220, 50]);
  assert.equal(written.split("@#$#@#$#@")[2], LEGACY.split("@#$#@#$#@")[2]);
});

test("setRootVersion replaces only the model version attribute", () => {
  // Catches rewriting a version-like string inside the code or another element.
  const legacyXml = '<?xml version="1.0"?><model version="NetLogo 6.2.0" snapToGrid="false">';
  assert.equal(
    setRootVersion(legacyXml, "NetLogo 7.0.4"),
    '<?xml version="1.0"?><model version="NetLogo 7.0.4" snapToGrid="false">',
  );
});
