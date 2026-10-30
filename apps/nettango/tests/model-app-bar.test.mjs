import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMenuItems,
  buildOverflowItems,
  buildStepLinks,
  buildTrail,
} from "../app/components/Models/ModelAppBar/helpers.ts";
import { getModelNavigation } from "../app/utils/modelCuration.ts";

const models = [
  { id: "intro", title: "Intro" },
  { id: "middle", title: "Middle" },
  { id: "last", title: "Last" },
  { id: "loner", title: "Loner" },
];

const curation = {
  groups: [{ id: "steps", title: "Steps", description: "", lead: "", models: ["intro", "middle", "last"] }],
  sequences: [{ id: "seq", title: "Seq", models: ["intro", "middle", "last"] }],
  models: {},
};

const navigate = (id) => getModelNavigation(curation, models, id);

const overflowOptions = (studentMode) => ({
  studentMode,
  sidebarLabel: "Hide details",
  sidebarIcon: "i-sidebar",
  toggleSidebar: () => {},
  swap: () => {},
});

// Catches the first step linking somewhere or reading as an enabled previous button.
test("buildStepLinks disables the previous link on the first step", () => {
  const { previous } = buildStepLinks(navigate("intro").sequence, false);
  assert.deepEqual(previous, { tooltip: "First step", label: "No previous step", disabled: true });
});

// Catches the last step offering a next link.
test("buildStepLinks disables the next link on the last step", () => {
  const { next } = buildStepLinks(navigate("last").sequence, false);
  assert.deepEqual(next, { tooltip: "Last step", label: "No next step", disabled: true });
});

// Catches the step links dropping students back into the teacher view.
test("buildStepLinks keeps student mode on both step links", () => {
  const { previous, next } = buildStepLinks(navigate("middle").sequence, true);
  assert.equal(previous.to, "/models/intro?mode=student");
  assert.equal(next.to, "/models/last?mode=student");
  assert.equal(previous.label, "Previous step: Intro");
  assert.equal(next.tooltip, "Next: Last");
});

// Catches a model outside every group getting an empty or wrong topic crumb.
test("buildTrail has no topic entry for a model in no group", () => {
  assert.deepEqual(buildTrail(navigate("loner"), "Loner"), [{ label: "Loner" }]);
});

// Catches the topic crumb pointing away from the model's group on the library page.
test("buildTrail links the topic to its library group", () => {
  assert.deepEqual(buildTrail(navigate("middle"), "Middle"), [
    { label: "Steps", to: "/models-library#group-steps" },
    { label: "Middle" },
  ]);
});

// Catches the menu losing the current model marker or marking another model.
test("buildMenuItems marks only the current model", () => {
  const [group] = buildMenuItems(navigate("middle"), false);
  const current = group.filter((item) => item.slot === "current").map((item) => item.label);
  assert.deepEqual(current, ["Middle"]);
});

// Catches the menu links dropping student mode.
test("buildMenuItems keeps student mode on model links", () => {
  const [group] = buildMenuItems(navigate("middle"), true);
  assert.equal(group[1].to, "/models/intro?mode=student");
});

// Catches students seeing the sidebar and swap actions in the phone menu.
test("buildOverflowItems hides the view actions in student mode", () => {
  const labels = (studentMode) =>
    buildOverflowItems(navigate("loner"), overflowOptions(studentMode)).flat().map((item) => item.label);
  assert.deepEqual(labels(true), ["Tutorial"]);
  assert.deepEqual(labels(false), ["Tutorial", "Hide details", "Swap sides"]);
});

// Catches the phone menu losing the sequence steps.
test("buildOverflowItems lists the neighbouring steps first", () => {
  const [steps] = buildOverflowItems(navigate("middle"), overflowOptions(false));
  assert.deepEqual(steps.map((item) => item.label), ["Step 2 of 3 in Seq", "Intro", "Last"]);
});
