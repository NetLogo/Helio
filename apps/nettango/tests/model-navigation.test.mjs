import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { getModelNavigation } from "../app/utils/modelCuration.ts";

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
test("getModelNavigation keeps the overlay order of groups and their models", () => {
  const { groups } = getModelNavigation(curation(), models, "ants");
  assert.deepEqual(
    groups.map(({ id, models: members }) => [id, members.map(({ id: modelId }) => modelId)]),
    [
      ["predators", ["wolves", "ants"]],
      ["steps", ["intro", "middle", "last"]],
    ],
  );
});

// Catches the menu marking no model, or more than one, as the current one.
test("getModelNavigation marks only the current model", () => {
  const current = getModelNavigation(curation(), models, "middle")
    .groups.flatMap(({ models: members }) => members)
    .filter((model) => model.current)
    .map(({ id }) => id);
  assert.deepEqual(current, ["middle"]);
});

// Catches the trail naming the wrong topic, or a topic for a model that is not in the overlay.
test("getModelNavigation finds the topic holding the model, or none", () => {
  assert.deepEqual(getModelNavigation(curation(), models, "ants").topic, { id: "predators", title: "Predators" });
  assert.equal(getModelNavigation(curation(), models, "missing").topic, null);
});

// Catches previous and next pointing the wrong way or past the ends of the sequence.
test("getModelNavigation gives the neighbours in the sequence with their titles", () => {
  assert.deepEqual(getModelNavigation(curation(), models, "middle").sequence, {
    title: "Seq",
    step: 2,
    total: 3,
    previous: { id: "intro", title: "Intro" },
    next: { id: "last", title: "Last" },
  });
  const first = getModelNavigation(curation(), models, "intro").sequence;
  assert.equal(first.previous, null);
  assert.deepEqual(first.next, { id: "middle", title: "Middle" });
  assert.equal(getModelNavigation(curation(), models, "last").sequence.next, null);
});

// Catches prev and next buttons shown for a model outside every sequence.
test("getModelNavigation has no sequence for a standalone model", () => {
  assert.equal(getModelNavigation(curation(), models, "ants").sequence, null);
});

// Catches a next button linking to a model the gallery does not have.
test("getModelNavigation drops a neighbour missing from the gallery", () => {
  const withoutLast = models.filter(({ id }) => id !== "last");
  assert.equal(getModelNavigation(curation(), withoutLast, "middle").sequence.next, null);
});

// Catches the shipped overlay drifting from what the app bar promises: six topics and the Antomology steps.
test("getModelNavigation on the shipped data has six topics and places Pheromones in its sequence", async () => {
  const [shippedCuration, shippedModels] = await Promise.all([
    readJson("../app/data/model-curation.json"),
    readJson("../app/data/models.json"),
  ]);
  const nav = getModelNavigation(shippedCuration, shippedModels, "antomology-pheromones");
  assert.equal(nav.groups.length, 6);
  assert.equal(nav.topic.id, "antomology");
  assert.equal(nav.sequence.step, 4);
  assert.equal(nav.sequence.total, 6);
  assert.equal(nav.sequence.previous.id, "antomology-ant-colony");
  assert.equal(getModelNavigation(shippedCuration, shippedModels, "ants").sequence, null);
});
