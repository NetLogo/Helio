import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { checkCuration } from "../scripts/check-curation.mjs";
import { modelMetadata, resolveGroups, sequencePosition } from "../app/utils/modelCuration.ts";

const models = [{ id: "a" }, { id: "b" }, { id: "c" }];

const valid = () => ({
  groups: [
    { id: "g1", title: "One", description: "d", lead: "a", models: ["a", "b"] },
    { id: "g2", title: "Two", description: "d", lead: "c", models: ["c"] },
  ],
  sequences: [{ id: "s1", title: "Seq", models: ["a", "b"] }],
  models: {
    a: {
      subjects: ["Biology"],
      gradeBands: ["middle-school"],
      creators: ["Name"],
      tips: ["Tip"],
      related: ["c"],
      lesson: { title: "L", url: "https://example.com", provider: "P" },
    },
    b: { subjects: [], gradeBands: [], creators: [], tips: [], related: [], lesson: null },
  },
});

const problemsFor = (mutate) => {
  const curation = valid();
  mutate(curation);
  return checkCuration(models, curation);
};

test("a consistent fixture has no problems", () => {
  assert.deepEqual(checkCuration(models, valid()), []);
});

test("reports a model that is in no group", () => {
  // Would catch: a synced library model silently missing from the gallery.
  const problems = problemsFor((c) => c.groups[1].models.pop());
  assert.ok(problems.some((p) => p.includes('"c" is in no group')));
});

test("reports a model in more than one group", () => {
  // Would catch: a model rendered twice in the gallery.
  const problems = problemsFor((c) => c.groups[1].models.push("a"));
  assert.ok(problems.some((p) => p.includes('"a" is in more than one group')));
});

test("reports a lead that is not in its own group", () => {
  // Would catch: a group whose entry point is a model from elsewhere.
  const problems = problemsFor((c) => (c.groups[0].lead = "c"));
  assert.ok(problems.some((p) => p.includes('lead "c"')));
});

test("reports a sequence member missing from models.json", () => {
  // Would catch: a sequence step pointing at a removed model.
  const problems = problemsFor((c) => c.sequences[0].models.push("zzz"));
  assert.ok(problems.some((p) => p.includes('sequence "s1": member "zzz"')));
});

test("reports sequence members spread over several groups", () => {
  // Would catch: a path that crosses group sections in the gallery.
  const problems = problemsFor((c) => c.sequences[0].models.push("c"));
  assert.ok(problems.some((p) => p.includes("span several groups")));
});

test("reports a model in more than one sequence", () => {
  // Would catch: ambiguous "Step N of M" labels.
  const problems = problemsFor((c) =>
    c.sequences.push({ id: "s2", title: "Other", models: ["b"] }),
  );
  assert.ok(problems.some((p) => p.includes('"b" is in more than one sequence')));
});

test("reports a related id that does not exist", () => {
  // Would catch: a dead "related model" link.
  const problems = problemsFor((c) => c.models.a.related.push("zzz"));
  assert.ok(problems.some((p) => p.includes('related id "zzz"')));
});

test("reports a model that lists itself as related", () => {
  // Would catch: a model recommending itself.
  const problems = problemsFor((c) => c.models.a.related.push("a"));
  assert.ok(problems.some((p) => p.includes("related lists the model itself")));
});

test("reports an overlay entry for an unknown model", () => {
  // Would catch: stale metadata left after a model is dropped from models.json.
  const problems = problemsFor((c) => (c.models.zzz = { ...c.models.b }));
  assert.ok(problems.some((p) => p.includes('overlay entry "zzz"')));
});

test("reports a group member that does not exist", () => {
  // Would catch: a group listing a model that models.json no longer has.
  const problems = problemsFor((c) => c.groups[1].models.push("zzz"));
  assert.ok(problems.some((p) => p.includes('group "g2": member "zzz"')));
});

test("reports a gradeBands value outside the union", () => {
  // Would catch: a typo such as "highschool" that filters would never match.
  const problems = problemsFor((c) => c.models.b.gradeBands.push("highschool"));
  assert.ok(problems.some((p) => p.includes('"highschool"')));
});

test("reports a lesson without a url", () => {
  // Would catch: a "Lesson" badge with nowhere to go.
  const problems = problemsFor((c) => (c.models.a.lesson.url = ""));
  assert.ok(problems.some((p) => p.includes("lesson needs a title and a url")));
});

test("reports a lesson without a title", () => {
  // Would catch: an untitled lesson link.
  const problems = problemsFor((c) => (c.models.a.lesson.title = ""));
  assert.ok(problems.some((p) => p.includes("lesson needs a title and a url")));
});

const has = (problems, text) => problems.some((p) => p.includes(text));

test("reports a missing or non-array list field instead of throwing", () => {
  // Would catch: a TypeError crash on hand-edited overlay data.
  const problems = problemsFor((c) => {
    delete c.models.a.gradeBands;
    c.models.b.related = "c";
  });
  assert.ok(has(problems, 'model "a": gradeBands must be an array'));
  assert.ok(has(problems, 'model "b": related must be an array'));
});

test("reports a missing tips, subjects or creators field", () => {
  // Would catch: the later tips task leaving a model without the array.
  const problems = problemsFor((c) => delete c.models.a.tips);
  assert.ok(has(problems, 'model "a": tips must be an array'));
});

test("reports non-string and empty-string list entries", () => {
  // Would catch: blank tips or numeric ids slipping into the overlay.
  const problems = problemsFor((c) => {
    c.models.a.tips = ["ok", ""];
    c.models.b.related = [5];
  });
  assert.ok(has(problems, 'model "a": tips must contain only non-empty strings'));
  assert.ok(has(problems, 'model "b": related must contain only non-empty strings'));
});

test("reports more than three related ids", () => {
  // Would catch: related lists growing past the contract.
  const extra = [{ id: "d" }, { id: "e" }, { id: "f" }];
  const curation = valid();
  curation.groups[1].models.push("d", "e", "f");
  curation.models.b.related = ["c", "d", "e", "f"];
  const problems = checkCuration([...models, ...extra], curation);
  assert.ok(has(problems, 'model "b": related has 4 ids'));
});

test("reports a duplicate related id", () => {
  // Would catch: the same suggestion shown twice.
  const problems = problemsFor((c) => c.models.a.related.push("c"));
  assert.ok(has(problems, 'related lists "c" more than once'));
});

test("reports a related id inside the model's own sequence", () => {
  // Would catch: related repeating what the sequence already shows.
  const problems = problemsFor((c) => c.models.a.related.push("b"));
  assert.ok(has(problems, 'related id "b" is in the model\'s own sequence'));
});

test("reports duplicate group ids", () => {
  // Would catch: two groups colliding on one anchor id.
  const problems = problemsFor((c) => (c.groups[1].id = "g1"));
  assert.ok(has(problems, 'group id "g1" appears more than once'));
});

test("reports duplicate ids in models.json", () => {
  // Would catch: two gallery entries sharing one route.
  const problems = checkCuration([...models, { id: "a" }], valid());
  assert.ok(has(problems, 'models.json: id "a" appears more than once'));
});

test("reports a duplicate id within one sequence", () => {
  // Would catch: "Step 1 of 3" pointing at the same model twice.
  const problems = problemsFor((c) => c.sequences[0].models.push("a"));
  assert.ok(has(problems, 'sequence "s1": member "a" appears more than once'));
});

test("reports a lesson url that does not parse", () => {
  // Would catch: a "Lesson" link that is not a URL.
  const problems = problemsFor((c) => (c.models.a.lesson.url = "not a url"));
  assert.ok(has(problems, "is not a valid URL"));
});

test("reports a lesson without a provider", () => {
  // Would catch: a lesson with no credit line.
  const problems = problemsFor((c) => (c.models.a.lesson.provider = ""));
  assert.ok(has(problems, "lesson needs a provider"));
});

test("modelMetadata returns the entry or null", () => {
  // Would catch: undefined leaking out for models without an overlay entry.
  const curation = valid();
  assert.equal(modelMetadata(curation, "a"), curation.models.a);
  assert.equal(modelMetadata(curation, "c"), null);
});

test("sequencePosition reports the first and a middle step", () => {
  // Would catch: swapped previous and next.
  const curation = valid();
  curation.sequences[0].models = ["a", "b", "c"];
  assert.deepEqual(sequencePosition(curation, "a"), {
    title: "Seq",
    step: 1,
    total: 3,
    previous: null,
    next: "b",
  });
  assert.deepEqual(sequencePosition(curation, "b"), {
    title: "Seq",
    step: 2,
    total: 3,
    previous: "a",
    next: "c",
  });
});

test("resolveGroups drops a group whose members are all unknown", () => {
  // Would catch: an empty heading rendered in the gallery.
  const curation = valid();
  curation.groups.push({ id: "g3", title: "Empty", description: "d", lead: "x", models: ["x"] });
  assert.deepEqual(
    resolveGroups(curation, models).map((g) => g.id),
    ["g1", "g2"],
  );
});

test("resolveGroups keeps a model's first placement when it is in two groups", () => {
  // Would catch: a model rendered in two sections.
  const curation = valid();
  curation.groups[1].models.push("a");
  const groups = resolveGroups(curation, models);
  assert.deepEqual(
    groups[0].models.map((m) => m.id),
    ["a", "b"],
  );
  assert.deepEqual(
    groups[1].models.map((m) => m.id),
    ["c"],
  );
});

test("the real models.json and model-curation.json validate clean", async () => {
  // Would catch: a sync or an edit that leaves the two data files inconsistent.
  const read = async (name) =>
    JSON.parse(await readFile(new URL(`../app/data/${name}`, import.meta.url), "utf8"));
  assert.deepEqual(checkCuration(await read("models.json"), await read("model-curation.json")), []);
});

test("resolveGroups keeps overlay order and appends unplaced models as More models", () => {
  // Would catch: a newly synced model vanishing from the gallery.
  const curation = valid();
  curation.groups[1].models = [];
  const groups = resolveGroups(curation, models);
  assert.deepEqual(
    groups.map((g) => [g.title, g.models.map((m) => m.id)]),
    [
      ["One", ["a", "b"]],
      ["More models", ["c"]],
    ],
  );
});

test("resolveGroups skips unknown group members without throwing", () => {
  // Would catch: a crash when the overlay mentions a model that was removed.
  const curation = valid();
  curation.groups[0].models.push("zzz");
  const groups = resolveGroups(curation, models);
  assert.deepEqual(
    groups[0].models.map((m) => m.id),
    ["a", "b"],
  );
});

test("sequencePosition reports step, total and neighbours, or null", () => {
  // Would catch: off-by-one step numbers or wrong neighbours.
  const curation = valid();
  assert.deepEqual(sequencePosition(curation, "b"), {
    title: "Seq",
    step: 2,
    total: 2,
    previous: "a",
    next: null,
  });
  assert.equal(sequencePosition(curation, "c"), null);
});
