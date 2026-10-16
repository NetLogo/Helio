import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { serializeProject } from "./extract.mjs";
import { formatOf, readWidgets, writeWidgets } from "./widgets.mjs";

export const LAYOUT = {
  left: 5,
  top: 10,
  gap: 5,
  column: 340,
  viewGap: 10,
};

/* Widths are minimums: a wider original keeps its width (rounded up to the grid, capped
   at the column) so long labels are not clipped. */
export const SIZES = {
  button: { width: 95, height: 40 },
  slider: { width: 220, height: 50 },
  switch: { width: 115, height: 40 },
  chooser: { width: 220, height: 60 },
  monitor: { width: 100, height: 60 },
  input: { width: 220, height: 60 },
  plot: { width: 340, height: 235 },
};

const SETTINGS = new Set(["slider", "switch", "chooser", "input"]);
const FULL_ROW = new Set(["slider", "chooser", "input", "plot", "output", "note"]);

const ceilToGrid = (value) => Math.ceil(value / 5) * 5;
const byPosition = (a, b) => a.y - b.y || a.x - b.x;

const isMultilineInput = (widget) =>
  widget.type === "input" && widget.attributes.multiline === "true";
const isVerticalSlider = (widget) =>
  widget.type === "slider" && widget.attributes.direction === "Vertical";

export const hasFixedSize = (widget) =>
  Boolean(SIZES[widget.type]) && !isMultilineInput(widget) && !isVerticalSlider(widget);

export function targetSize(widget) {
  if (!hasFixedSize(widget)) return { width: widget.width, height: widget.height };
  const size = SIZES[widget.type];
  const width = Math.min(Math.max(size.width, ceilToGrid(widget.width)), LAYOUT.column);
  return { width, height: size.height };
}

export function derivedViewSize(view) {
  const { minPxcor, maxPxcor, minPycor, maxPycor, patchSize } = view.attributes;
  const size = Number(patchSize);
  return {
    width: Math.round((Number(maxPxcor) - Number(minPxcor) + 1) * size + 4),
    height: Math.round((Number(maxPycor) - Number(minPycor) + 1) * size + 4),
    roundPatch: Number.isInteger(size),
  };
}

export const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export function findOverlaps(widgets) {
  const pairs = [];
  widgets.forEach((a, i) => {
    for (const b of widgets.slice(i + 1)) if (overlaps(a, b)) pairs.push([a, b]);
  });
  return pairs;
}

export function boundingBox(widgets) {
  const right = Math.max(...widgets.map((w) => w.x + w.width));
  const bottom = Math.max(...widgets.map((w) => w.y + w.height));
  return { width: right, height: bottom };
}

function stack(groups) {
  const placed = [];
  let y = LAYOUT.top;
  for (const group of groups) {
    let x = LAYOUT.left;
    let rowHeight = 0;
    const newRow = () => {
      if (rowHeight > 0) y += rowHeight + LAYOUT.gap;
      x = LAYOUT.left;
      rowHeight = 0;
    };
    for (const widget of group) {
      const size = targetSize(widget);
      const full = FULL_ROW.has(widget.type);
      if (full || x + size.width > LAYOUT.left + LAYOUT.column) newRow();
      placed.push({ ...widget, x, y, ...size, sizeVersion: null });
      x += size.width + LAYOUT.gap;
      rowHeight = Math.max(rowHeight, size.height);
      if (full) newRow();
    }
    newRow();
  }
  return placed;
}

/* Settings above the first button stay above the button row and the rest go below it:
   which settings only affect setup is a judgment the original author already encoded
   in their order, and the style guide asks for exactly that order. */
export function reflow(widgets) {
  const view = widgets.find((w) => w.type === "view");
  if (!view) throw new Error("model has no view");
  const others = widgets.filter((w) => w !== view).sort(byPosition);
  const of = (...types) => others.filter((w) => types.includes(w.type));
  const buttons = of("button");
  const buttonTop = buttons.length ? Math.min(...buttons.map((w) => w.y)) : Infinity;
  const settings = others.filter((w) => SETTINGS.has(w.type));
  const column = stack([
    settings.filter((w) => w.y < buttonTop),
    buttons,
    settings.filter((w) => w.y >= buttonTop),
    of("monitor"),
    of("plot"),
    of("output"),
    of("note"),
  ]);
  const known = new Set(column.map((w) => w.span[0]));
  const unknown = others.filter((w) => !known.has(w.span[0]));
  if (unknown.length) throw new Error(`unsupported widget types: ${unknown.map((w) => w.type)}`);

  const columnRight = column.length ? Math.max(...column.map((w) => w.x + w.width)) : 0;
  const { width, height, roundPatch } = derivedViewSize(view);
  const placedView = {
    ...view,
    x: ceilToGrid(columnRight + LAYOUT.viewGap),
    y: LAYOUT.top,
    width,
    height,
  };
  const result = [placedView, ...column];
  const warnings = [];
  if (!roundPatch) warnings.push(`patch size ${view.attributes.patchSize} is not round`);
  const box = boundingBox(result);
  if (box.width > 1024 || box.height > 768) {
    warnings.push(`interface ${box.width}x${box.height} does not fit 1024x768`);
  }
  return { widgets: result, overlaps: findOverlaps(result), warnings };
}

export function reflowCode(code) {
  if (formatOf(code) !== "nlogox") throw new Error("legacy model: run convert.mjs first");
  const before = readWidgets(code);
  const result = reflow(before);
  return {
    ...result,
    code: writeWidgets(code, result.widgets),
    before: boundingBox(before),
    after: boundingBox(result.widgets),
  };
}

const describe = (w) => `${w.type} '${w.label}'`;

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const [input] = process.argv.slice(2);
  if (!input) {
    console.error("usage: reflow.mjs MODEL.ntjson");
    process.exit(2);
  }
  const project = JSON.parse(await readFile(input, "utf8"));
  const result = reflowCode(project.code);
  await writeFile(input, serializeProject({ ...project, code: result.code }));
  console.log(
    `${basename(input)}: ${result.before.width}x${result.before.height} -> ${result.after.width}x${result.after.height}`,
  );
  for (const warning of result.warnings) console.log(`  warning: ${warning}`);
  for (const [a, b] of result.overlaps) console.log(`  overlap: ${describe(a)} and ${describe(b)}`);
  if (result.overlaps.length) process.exit(1);
}
