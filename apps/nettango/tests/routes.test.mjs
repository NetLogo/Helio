import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { getGroupPath, getModelPath, TUTORIAL_PATH } from "../shared/utils/routes.ts";

// Catches the shared link or the sequence links dropping the student view.
test("getModelPath adds the student query only in student mode", () => {
  assert.equal(getModelPath("ants"), "/models/ants");
  assert.equal(getModelPath("ants", true), "/models/ants?mode=student");
});

// Catches a model id with a space or slash producing a broken or wrong route.
test("getModelPath encodes the model id", () => {
  assert.equal(getModelPath("gas law"), "/models/gas%20law");
  assert.equal(getModelPath("a/b", true), "/models/a%2Fb?mode=student");
});

// Catches a topic link pointing at an anchor the library page does not render.
test("getGroupPath points at the group anchor on the library page", () => {
  assert.equal(getGroupPath("ants"), "/models-library#group-ants");
});

// Catches the tutorial link pointing at a page the content folder no longer has.
test("TUTORIAL_PATH names a tutorial in the content folder", () => {
  assert.ok(existsSync(new URL(`../content${TUTORIAL_PATH}.md`, import.meta.url)));
});
