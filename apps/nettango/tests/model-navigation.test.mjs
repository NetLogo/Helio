import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { modelNavigation } from "../app/utils/modelCuration.ts";

const models = [
  { id: "ants", title: "Ants" },
  { id: "intro", title: "Intro" },
  { id: "middle", title: "Middle" },
  { id: "last", title: "Last" },
  { id: "wolves", title: "Wolves" },
];

const curation = () => ({
  groups: [
    { id: "predators", title: "Predators", description: "", lead: "", models: ["wolves", "ants"] },
    { id: "steps", title: "Steps", description: "", lead: "", models: ["intro", "middle", "last"] },
  ],
  sequences: [{ id: "seq", title: "Seq", models: ["intro", "middle", "last"] }],
  models: {},
});

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

// Catches the menu listing topics or models in gallery order instead of the overlay order.
test("modelNavigation keeps the overlay order of groups and their models", () => {
  const { groups } = modelNavigation(curation(), models, "ants");
  assert.deepEqual(
    groups.map(({ id, models: members }) => [id, members.map(({ id: modelId }) => modelId)]),
    [
      ["predators", ["wolves", "ants"]],
      ["steps", ["intro", "middle", "last"]],
    ],
  );
});

// Catches the menu marking no model, or more than one, as the current one.
test("modelNavigation marks only the current model", () => {
  const current = modelNavigation(curation(), models, "middle")
    .groups.flatMap(({ models: members }) => members)
    .filter((model) => model.current)
    .map(({ id }) => id);
  assert.deepEqual(current, ["middle"]);
});

// Catches the trail naming the wrong topic, or a topic for a model that is not in the overlay.
test("modelNavigation finds the topic holding the model, or none", () => {
  assert.deepEqual(modelNavigation(curation(), models, "ants").topic, { id: "predators", title: "Predators" });
  assert.equal(modelNavigation(curation(), models, "missing").topic, null);
});

// Catches previous and next pointing the wrong way or past the ends of the sequence.
test("modelNavigation gives the neighbours in the sequence with their titles", () => {
  assert.deepEqual(modelNavigation(curation(), models, "middle").sequence, {
    title: "Seq",
    step: 2,
    total: 3,
    previous: { id: "intro", title: "Intro" },
    next: { id: "last", title: "Last" },
  });
  const first = modelNavigation(curation(), models, "intro").sequence;
  assert.equal(first.previous, null);
  assert.deepEqual(first.next, { id: "middle", title: "Middle" });
  assert.equal(modelNavigation(curation(), models, "last").sequence.next, null);
});

// Catches prev and next buttons shown for a model outside every sequence.
test("modelNavigation has no sequence for a standalone model", () => {
  assert.equal(modelNavigation(curation(), models, "ants").sequence, null);
});

// Catches a next button linking to a model the gallery does not have.
test("modelNavigation drops a neighbour missing from the gallery", () => {
  const withoutLast = models.filter(({ id }) => id !== "last");
  assert.equal(modelNavigation(curation(), withoutLast, "middle").sequence.next, null);
});

// Catches the shipped overlay drifting from what the app bar promises: eight topics and the Antomology steps.
test("modelNavigation on the shipped data has eight topics and places Pheromones in its sequence", async () => {
  const [shippedCuration, shippedModels] = await Promise.all([
    readJson("../app/data/model-curation.json"),
    readJson("../app/data/models.json"),
  ]);
  const nav = modelNavigation(shippedCuration, shippedModels, "antomology-pheromones");
  assert.equal(nav.groups.length, 8);
  assert.equal(nav.topic.id, "ant-colonies");
  assert.equal(nav.sequence.step, 4);
  assert.equal(nav.sequence.total, 6);
  assert.equal(nav.sequence.previous.id, "antomology-ant-colony");
  assert.equal(modelNavigation(shippedCuration, shippedModels, "ants").sequence, null);
});
