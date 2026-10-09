import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { extractProject } from "./extract.mjs";
import { boundingBox, derivedViewSize, findOverlaps, hasFixedSize, SIZES } from "./reflow.mjs";
import { formatOf, readWidgets } from "./widgets.mjs";

export const TYPOS = [/intitial/i, /rollipollie/i];

/* The NetTango Builder's HTML export grows the view by 4x5 px over the derived size, and
   the shipped players and projects are Builder exports, so that size is accepted too. */
const BUILDER_VIEW_GROWTH = [4, 5];

const onGrid = (value) => value % 5 === 0;
const describe = (w) => `${w.type} '${w.label}'`;

/* Dashes and ALL CAPS are style guide rules for display names only, so they apply to
   button and monitor labels, which show either the display name or the code. */
function namingProblems(widget) {
  const problems = [];
  const label = widget.label ?? "";
  if (/\p{Cc}/u.test(label.replace(/[\n\t]/g, ""))) {
    problems.push(`naming: ${describe(widget)} contains a control character`);
  }
  for (const typo of TYPOS) {
    const names = [label, widget.attributes.variable ?? ""];
    if (names.some((name) => typo.test(name))) {
      problems.push(`naming: ${describe(widget)} matches typo ${typo}`);
    }
  }
  if (widget.type === "button" || widget.type === "monitor") {
    if (/\S-\S/u.test(label)) problems.push(`naming: ${describe(widget)} has a dash`);
    if (/\p{Lu}{2}/u.test(label) && label === label.toUpperCase()) {
      problems.push(`naming: ${describe(widget)} is ALL CAPS`);
    }
  }
  return problems;
}

function heightProblems(widget) {
  if (!hasFixedSize(widget)) return [];
  const size = SIZES[widget.type];
  return widget.height === size.height
    ? []
    : [`height: ${describe(widget)} is ${widget.height}, expected ${size.height}`];
}

export function checkCode(code) {
  const widgets = readWidgets(code);
  const view = widgets.find((w) => w.type === "view");
  const problems = [];
  if (formatOf(code) === "legacy") problems.push("format: legacy .nlogo code, run convert.mjs");
  for (const [a, b] of findOverlaps(widgets)) {
    problems.push(`overlap: ${describe(a)} and ${describe(b)}`);
  }
  for (const widget of widgets) problems.push(...namingProblems(widget));
  if (formatOf(code) === "legacy") return problems;

  for (const widget of widgets) {
    problems.push(...heightProblems(widget));
    if (widget.sizeVersion !== null) {
      problems.push(`height: ${describe(widget)} carries sizeVersion="${widget.sizeVersion}"`);
    }
    const sized = hasFixedSize(widget)
      ? [widget.x, widget.y, widget.width, widget.height]
      : [widget.x, widget.y];
    if (!sized.every(onGrid)) {
      problems.push(
        `grid: ${describe(widget)} at ${widget.x},${widget.y} ${widget.width}x${widget.height}`,
      );
    }
  }
  if (view) {
    const derived = derivedViewSize(view);
    const atSize = (dw, dh) =>
      view.width === derived.width + dw && view.height === derived.height + dh;
    if (!atSize(0, 0) && !atSize(...BUILDER_VIEW_GROWTH)) {
      problems.push(
        `view: ${view.width}x${view.height}, derived ${derived.width}x${derived.height}`,
      );
    }
    if (!derived.roundPatch)
      problems.push(`view: patch size ${view.attributes.patchSize} is not round`);
    for (const widget of widgets.filter((w) => w !== view)) {
      if (widget.x >= view.x + view.width || widget.y >= view.y + view.height) {
        problems.push(`layout: ${describe(widget)} is right of or below the view`);
      }
    }
  }
  const box = boundingBox(widgets);
  if (box.width > 1024 || box.height > 768) {
    problems.push(`fit: interface ${box.width}x${box.height} exceeds 1024x768`);
  }
  return problems;
}

const MODELS_DIR = fileURLToPath(new URL("../../public/assets/models/", import.meta.url));
const MODELS_JSON = new URL("../../app/data/models.json", import.meta.url);

async function sourcesFor(id) {
  const sources = [];
  const html = `${MODELS_DIR}${id}.html`;
  const ntjson = `${MODELS_DIR}${id}.ntjson`;
  if (existsSync(ntjson))
    sources.push({ name: `${id}.ntjson`, ...JSON.parse(await readFile(ntjson, "utf8")) });
  if (existsSync(html)) {
    sources.push({ name: `${id}.html`, ...extractProject(await readFile(html, "utf8")).project });
  }
  return sources;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const args = process.argv.slice(2);
  const ids = args.includes("--all")
    ? JSON.parse(await readFile(MODELS_JSON, "utf8")).map((model) => model.id)
    : args;
  if (!ids.length) {
    console.error("usage: check.mjs MODEL-ID... | --all");
    process.exit(2);
  }
  let failing = 0;
  for (const id of ids) {
    const sources = await sourcesFor(id);
    if (!sources.length) {
      console.log(`${id}: no .ntjson or .html found`);
      failing += 1;
      continue;
    }
    const problems = sources.flatMap((source) =>
      checkCode(source.code).map((problem) => `${source.name}: ${problem}`),
    );
    if (sources.length === 2 && sources[0].code !== sources[1].code) {
      problems.push(`${id}.html: player code differs from ${id}.ntjson, run make-player.mjs`);
    }
    if (problems.length) failing += 1;
    console.log(problems.length ? `${id}: ${problems.length} problems` : `${id}: ok`);
    for (const problem of problems) console.log(`  ${problem}`);
  }
  console.log(`${ids.length - failing} of ${ids.length} models clean`);
  if (failing) process.exit(1);
}
