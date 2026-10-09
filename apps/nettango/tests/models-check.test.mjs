import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCode } from "../scripts/models/check.mjs";

const VIEW =
  '<view x="355" y="10" width="524" height="332" minPxcor="-32" maxPxcor="32" minPycor="-20" maxPycor="20" patchSize="8"/>';
const SETUP = '<button x="5" y="10" width="95" height="40" display="setup">setup</button>';

const model = (...widgets) =>
  `<model version="NetLogo 7.0.4"><widgets>${widgets.join("")}</widgets></model>`;

const problemsWith = (...widgets) => checkCode(model(VIEW, SETUP, ...widgets));

test("a reflowed model has no problems", () => {
  // Catches a rule that fires on the template's own output.
  assert.deepEqual(
    problemsWith('<note x="5" y="55" width="115" height="18">Powered by NetLogo</note>'),
    [],
  );
});

test("check flags each rule on its failing input", () => {
  // Each case catches one rule that no longer fires.
  const cases = [
    [
      '<slider x="5" y="55" width="220" height="33" variable="speed"/>',
      /^height: slider 'speed' is 33, expected 50$/,
    ],
    [
      '<button x="105" y="10" width="95" height="40" sizeVersion="0">go</button>',
      /^height: button 'go' carries sizeVersion="0"$/,
    ],
    [
      '<button x="50" y="20" width="95" height="40">go</button>',
      /^overlap: button 'setup' and button 'go'$/,
    ],
    [
      '<button x="107" y="10" width="95" height="40">go</button>',
      /^grid: button 'go' at 107,10 95x40$/,
    ],
    [
      '<button x="400" y="400" width="95" height="40">go</button>',
      /^layout: button 'go' is right of or below the view$/,
    ],
    [
      '<button x="105" y="10" width="95" height="40" display="go&#x99;">go</button>'.replace(
        "&#x99;",
        "\u0099",
      ),
      /control character/,
    ],
    ['<slider x="5" y="55" width="220" height="50" variable="intitial-green"/>', /matches typo/],
    [
      '<button x="105" y="10" width="95" height="40">go-once</button>',
      /^naming: button 'go-once' has a dash$/,
    ],
    [
      '<monitor x="5" y="55" width="100" height="60" display="TOTAL">count turtles</monitor>',
      /^naming: monitor 'TOTAL' is ALL CAPS$/,
    ],
    [
      '<plot x="5" y="600" width="340" height="235" display="P"/>',
      /^fit: interface 879x835 exceeds 1024x768$/,
    ],
  ];
  for (const [extra, expected] of cases) {
    const problems = problemsWith(extra);
    assert.ok(
      problems.some((p) => expected.test(p)),
      `${expected} not in ${JSON.stringify(problems)}`,
    );
  }
});

test("check flags a view that is not at its derived size or has a fractional patch", () => {
  // Catches oversized views and non-round patch sizes passing.
  const oversized = VIEW.replace('width="524" height="332"', 'width="532" height="337"');
  assert.deepEqual(checkCode(model(oversized, SETUP)), ["view: 532x337, derived 524x332"]);
  const fractional = VIEW.replace('width="524" height="332"', 'width="430" height="273"').replace(
    'patchSize="8"',
    'patchSize="6.55"',
  );
  assert.deepEqual(checkCode(model(fractional, SETUP)), ["view: patch size 6.55 is not round"]);
});

test("check accepts the Builder's 4x5 px view growth and nothing near it", () => {
  // Catches the tolerance being dropped, or widened to any small growth.
  const grown = (w, h) => VIEW.replace('width="524" height="332"', `width="${w}" height="${h}"`);
  assert.deepEqual(checkCode(model(grown(528, 337), SETUP)), []);
  assert.deepEqual(checkCode(model(grown(528, 336), SETUP)), ["view: 528x336, derived 524x332"]);
  assert.deepEqual(checkCode(model(grown(527, 337), SETUP)), ["view: 527x337, derived 524x332"]);
});

test("check reports legacy code as unconverted and still checks overlap", () => {
  // Catches legacy models passing because the nlogox rules do not apply to them.
  const legacy =
    "to go end\n@#$#@#$#@\nBUTTON\n10\n10\n90\n43\nNIL\nsetup\n\nBUTTON\n50\n20\n130\n53\nNIL\ngo\n\n@#$#@#$#@\n";
  assert.deepEqual(checkCode(legacy), [
    "format: legacy .nlogo code, run convert.mjs",
    "overlap: button 'setup' and button 'go'",
  ]);
});
