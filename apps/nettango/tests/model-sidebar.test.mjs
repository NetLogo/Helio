import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getGradeBandLabels,
  getModelDescription,
  resolveModels,
  STUDENT_MODE_ATTRIBUTE,
  STUDENT_MODE_BOOT_SCRIPT,
  isSidebarHiddenQuery,
  isStudentModeQuery,
  formatTutorialCredit,
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

// Catches raw slugs like middle-school leaking into the page.
test("getGradeBandLabels names each band in order", () => {
  assert.deepEqual(getGradeBandLabels(["high-school", "elementary"]), [
    "High school",
    "Elementary school",
  ]);
});

// Catches a credit line that hardcodes one author instead of reading the overlay.
test("formatTutorialCredit names the tutorial author", () => {
  assert.equal(
    formatTutorialCredit({ title: "T", url: "https://example.com", author: "Jeremy Baker" }),
    "Tutorial by Jeremy Baker",
  );
});

// Catches the overlay description being ignored, or models without one losing their text.
test("getModelDescription prefers the overlay text and falls back to the model", () => {
  const model = { description: "Synced text." };
  assert.equal(getModelDescription(model, { description: "Curated text." }), "Curated text.");
  assert.equal(getModelDescription(model, {}), "Synced text.");
  assert.equal(getModelDescription(model, null), "Synced text.");
});

// Catches a query parser that hides the panel on anything but the exact "hidden" value.
test("isSidebarHiddenQuery hides the panel only for sidebar=hidden", () => {
  assert.equal(isSidebarHiddenQuery("hidden"), true);
  assert.equal(isSidebarHiddenQuery(["hidden", "open"]), true);
  assert.equal(isSidebarHiddenQuery("open"), false);
  assert.equal(isSidebarHiddenQuery(undefined), false);
  assert.equal(isSidebarHiddenQuery(null), false);
  assert.equal(isSidebarHiddenQuery(""), false);
  assert.equal(isSidebarHiddenQuery("HIDDEN"), false);
  assert.equal(isSidebarHiddenQuery("1"), false);
  assert.equal(isSidebarHiddenQuery(["open", "hidden"]), false);
});

// Catches the student view turning on for anything but the exact link teachers share.
test("isStudentModeQuery is on only for mode=student", () => {
  assert.equal(isStudentModeQuery("student"), true);
  assert.equal(isStudentModeQuery(["student", "teacher"]), true);
  for (const other of ["teacher", "STUDENT", "", undefined, null, ["teacher", "student"]]) {
    assert.equal(isStudentModeQuery(other), false, String(other));
  }
});

const runStudentBoot = (search) => {
  const attributes = new Map();
  const document = { documentElement: { setAttribute: (name, value) => attributes.set(name, value) } };
  new Function("location", "document", STUDENT_MODE_BOOT_SCRIPT)({ search }, document);
  return attributes.has(STUDENT_MODE_ATTRIBUTE);
};

// Catches teaching content flashing on a prerendered student page, or hiding on a teacher page.
test("STUDENT_MODE_BOOT_SCRIPT marks the page for mode=student only", () => {
  assert.equal(runStudentBoot("?mode=student"), true);
  assert.equal(runStudentBoot("?split=40&mode=student"), true);
  assert.equal(runStudentBoot(""), false);
  assert.equal(runStudentBoot("?mode=teacher"), false);
  assert.equal(runStudentBoot("?mode=teacher&mode=student"), false);
});
