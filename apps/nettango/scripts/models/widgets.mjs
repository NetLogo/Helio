const LEGACY_SEPARATOR = "@#$#@#$#@";

const LEGACY_TYPES = {
  "GRAPHICS-WINDOW": "view",
  BUTTON: "button",
  SLIDER: "slider",
  SWITCH: "switch",
  CHOOSER: "chooser",
  MONITOR: "monitor",
  PLOT: "plot",
  TEXTBOX: "note",
  INPUTBOX: "input",
  OUTPUT: "output",
};

export const formatOf = (code) => (/^\s*(<\?xml|<model[\s>])/.test(code) ? "nlogox" : "legacy");

const TOKEN =
  /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<(\/?)([A-Za-z][\w-]*)((?:\s+[^\s=/>]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
const ATTRIBUTE = /([^\s=/>]+)\s*=\s*"([^"]*)"/g;

const decodeEntities = (text) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const parseAttributes = (source) => {
  const attributes = {};
  for (const [, name, value] of source.matchAll(ATTRIBUTE))
    attributes[name] = decodeEntities(value);
  return attributes;
};

const elementText = (body) =>
  body
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, text) => text)
    .replace(/<[^>]*>/g, "")
    .trim();

const toGeometry = (attributes) => ({
  x: Number(attributes.x),
  y: Number(attributes.y),
  width: Number(attributes.width),
  height: Number(attributes.height),
});

const nlogoxLabel = (type, attributes, text) => {
  if (type === "note") return text;
  return attributes.display || attributes.variable || text;
};

function readNlogox(code) {
  const open = code.search(/<widgets\s*>/);
  if (open < 0) throw new Error("no <widgets> element");
  const start = code.indexOf(">", open) + 1;
  const widgets = [];
  let depth = 0;
  let current = null;
  TOKEN.lastIndex = start;
  for (let match; (match = TOKEN.exec(code)); ) {
    const [token, closing, name, attributeSource, selfClosing] = match;
    if (!name) continue;
    if (closing) {
      if (depth === 0 && name === "widgets") return widgets;
      depth -= 1;
      if (depth === 0 && current) {
        const text = elementText(code.slice(current.tagEnd, match.index));
        current.widget.label = nlogoxLabel(current.widget.type, current.widget.attributes, text);
        current = null;
      }
      continue;
    }
    if (depth === 0) {
      const attributes = parseAttributes(attributeSource);
      const widget = {
        type: name,
        ...toGeometry(attributes),
        sizeVersion: attributes.sizeVersion === undefined ? null : Number(attributes.sizeVersion),
        attributes,
        label: "",
        span: [match.index, match.index + token.length],
      };
      widgets.push(widget);
      if (selfClosing) widget.label = nlogoxLabel(name, attributes, "");
      else current = { widget, tagEnd: match.index + token.length };
    }
    if (!selfClosing) depth += 1;
  }
  throw new Error("unterminated <widgets> element");
}

const legacySections = (code) => {
  const sections = code.split(LEGACY_SEPARATOR);
  if (sections.length < 2) throw new Error("not a legacy .nlogo model: no section separators");
  return sections;
};

function legacyBlocks(section) {
  const blocks = [];
  const blank = /\n[ \t]*\n/g;
  let from = 0;
  for (const boundary of [...section.matchAll(blank), { index: section.length, 0: "" }]) {
    const raw = section.slice(from, boundary.index);
    const leading = raw.length - raw.trimStart().length;
    const text = raw.trim();
    if (text) {
      const lines = text.split("\n");
      blocks.push({ keyword: lines[0], lines, offset: from + leading });
    }
    from = boundary.index + boundary[0].length;
  }
  return blocks;
}

const legacyLabel = (lines) => {
  const display = lines[5];
  return display && display !== "NIL" ? display : (lines[6] ?? "");
};

function readLegacy(code) {
  const sections = legacySections(code);
  const base = sections[0].length + LEGACY_SEPARATOR.length;
  return legacyBlocks(sections[1])
    .filter((block) => LEGACY_TYPES[block.keyword])
    .map((block) => {
      const [left, top, right, bottom] = block.lines.slice(1, 5).map(Number);
      return {
        type: LEGACY_TYPES[block.keyword],
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        sizeVersion: null,
        attributes: {},
        label: block.keyword === "GRAPHICS-WINDOW" ? "" : legacyLabel(block.lines),
        span: [base + block.offset, base + block.offset + block.lines.join("\n").length],
        lines: block.lines,
      };
    });
}

export function readWidgets(code) {
  return formatOf(code) === "nlogox" ? readNlogox(code) : readLegacy(code);
}

const GEOMETRY = ["x", "y", "width", "height"];

function rewriteStartTag(tag, widget) {
  let next = tag;
  for (const name of GEOMETRY) {
    const value = String(widget[name]);
    const pattern = new RegExp(`(\\s${name}\\s*=\\s*")[^"]*(")`);
    next = pattern.test(next)
      ? next.replace(pattern, `$1${value}$2`)
      : next.replace(/^<[\w-]+/, (head) => `${head} ${name}="${value}"`);
  }
  next = next.replace(/\s+sizeVersion\s*=\s*"[^"]*"/, "");
  if (widget.sizeVersion !== null && widget.sizeVersion !== undefined) {
    next = next.replace(/\s*(\/?)>$/, ` sizeVersion="${widget.sizeVersion}"$1>`);
  }
  return next;
}

function rewriteLegacyBlock(widget) {
  const lines = [...widget.lines];
  lines[1] = String(widget.x);
  lines[2] = String(widget.y);
  lines[3] = String(widget.x + widget.width);
  lines[4] = String(widget.y + widget.height);
  return lines.join("\n");
}

/* Widgets must come from readWidgets on the same code: their spans locate the text to
   replace, and replacing from the end keeps earlier spans valid. */
export function writeWidgets(code, widgets) {
  const nlogox = formatOf(code) === "nlogox";
  const ordered = [...widgets].sort((a, b) => b.span[0] - a.span[0]);
  let next = code;
  for (const widget of ordered) {
    const [from, to] = widget.span;
    const original = next.slice(from, to);
    const replacement = nlogox ? rewriteStartTag(original, widget) : rewriteLegacyBlock(widget);
    next = next.slice(0, from) + replacement + next.slice(to);
  }
  return next;
}

export function setRootVersion(code, version) {
  return code.replace(/(<model\b[^>]*\sversion\s*=\s*")[^"]*(")/, `$1${version}$2`);
}
