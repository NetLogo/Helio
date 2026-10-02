import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const GRADE_BANDS = ["elementary", "middle-school", "high-school"];

const MAX_RELATED = 3;

const duplicates = (ids) => ids.filter((id, index) => ids.indexOf(id) !== index);

export const checkCuration = (models, curation) => {
  const problems = [];
  const modelIds = new Set(models.map((model) => model.id));
  const groupOf = new Map();

  for (const id of new Set(duplicates(models.map((model) => model.id)))) {
    problems.push(`models.json: id "${id}" appears more than once`);
  }
  for (const id of new Set(duplicates(curation.groups.map((group) => group.id)))) {
    problems.push(`group id "${id}" appears more than once`);
  }

  for (const group of curation.groups) {
    if (!group.models.includes(group.lead)) {
      problems.push(`group "${group.id}": lead "${group.lead}" is not in its own models list`);
    }
    for (const id of group.models) {
      if (!modelIds.has(id)) {
        problems.push(`group "${group.id}": member "${id}" is not in models.json`);
      }
      if (groupOf.has(id)) {
        problems.push(
          `model "${id}" is in more than one group ("${groupOf.get(id)}", "${group.id}")`,
        );
      } else {
        groupOf.set(id, group.id);
      }
    }
  }

  for (const id of modelIds) {
    if (!groupOf.has(id)) problems.push(`model "${id}" is in no group`);
  }

  const sequenceOf = new Map();
  for (const sequence of curation.sequences) {
    const groups = new Set();
    for (const id of new Set(duplicates(sequence.models))) {
      problems.push(`sequence "${sequence.id}": member "${id}" appears more than once`);
    }
    for (const id of new Set(sequence.models)) {
      if (!modelIds.has(id)) {
        problems.push(`sequence "${sequence.id}": member "${id}" is not in models.json`);
      }
      if (sequenceOf.has(id)) {
        problems.push(
          `model "${id}" is in more than one sequence ("${sequenceOf.get(id)}", "${sequence.id}")`,
        );
      } else {
        sequenceOf.set(id, sequence.id);
      }
      if (groupOf.has(id)) groups.add(groupOf.get(id));
    }
    if (groups.size > 1) {
      problems.push(
        `sequence "${sequence.id}": members span several groups (${[...groups].join(", ")})`,
      );
    }
  }

  for (const [id, metadata] of Object.entries(curation.models)) {
    if (!modelIds.has(id)) problems.push(`overlay entry "${id}" is not in models.json`);

    const lists = {};
    for (const field of ["subjects", "gradeBands", "creators", "related", "tips"]) {
      const value = metadata[field];
      if (!Array.isArray(value)) {
        problems.push(`model "${id}": ${field} must be an array`);
        continue;
      }
      if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
        problems.push(`model "${id}": ${field} must contain only non-empty strings`);
        continue;
      }
      lists[field] = value;
    }

    for (const band of lists.gradeBands ?? []) {
      if (!GRADE_BANDS.includes(band)) {
        problems.push(
          `model "${id}": gradeBands value "${band}" is not one of ${GRADE_BANDS.join(", ")}`,
        );
      }
    }

    const related = lists.related ?? [];
    if (related.length > MAX_RELATED) {
      problems.push(
        `model "${id}": related has ${related.length} ids, the maximum is ${MAX_RELATED}`,
      );
    }
    for (const dup of new Set(duplicates(related))) {
      problems.push(`model "${id}": related lists "${dup}" more than once`);
    }
    const ownSequence = curation.sequences.find((sequence) => sequence.models.includes(id));
    for (const other of new Set(related)) {
      if (other === id) problems.push(`model "${id}": related lists the model itself`);
      else if (!modelIds.has(other)) {
        problems.push(`model "${id}": related id "${other}" is not in models.json`);
      } else if (ownSequence?.models.includes(other)) {
        problems.push(`model "${id}": related id "${other}" is in the model's own sequence`);
      }
    }

    const { lesson } = metadata;
    if (lesson) {
      if (!lesson.title || !lesson.url) {
        problems.push(`model "${id}": lesson needs a title and a url`);
      } else if (!URL.canParse(lesson.url)) {
        problems.push(`model "${id}": lesson url "${lesson.url}" is not a valid URL`);
      }
      if (!lesson.provider) problems.push(`model "${id}": lesson needs a provider`);
    }
  }

  return problems;
};

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const read = async (name) =>
    JSON.parse(await readFile(new URL(`../app/data/${name}`, import.meta.url), "utf8"));
  const problems = checkCuration(await read("models.json"), await read("model-curation.json"));
  if (problems.length > 0) {
    console.error(`Model curation has ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("Model curation is valid.");
}
