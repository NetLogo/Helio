/*
 * Parses yarn.lock text in either the Yarn 1 format (`# yarn lockfile v1`,
 * `version "1.2.3"`) or the Berry format (`__metadata:`, `version: 1.2.3`).
 * */

const isBerry = (text) => /^__metadata:/m.test(text);

/* The name ends at the first "@" after an optional scope, so aliases such as
 * `string-width-cjs@npm:string-width@^4.2.0` and Berry patch descriptors keep
 * the name they are installed under. */
const descriptorName = (descriptor) => {
  const at = descriptor.indexOf("@", 1);
  return at === -1 ? descriptor : descriptor.slice(0, at);
};

const splitHeader = (header) =>
  header
    .replace(/:$/, "")
    .split(",")
    .map((d) => d.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);

function parseLock(text) {
  const format = isBerry(text) ? "berry" : "v1";
  const versionLine = format === "berry" ? /^ {2}version: "?([^"\s]+)"?$/ : /^ {2}version "([^"]+)"$/;
  const entries = [];
  let current = null;

  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.startsWith("#")) continue;

    if (!line.startsWith(" ")) {
      current = null;
      if (format === "berry" && line.startsWith("__metadata:")) continue;
      const descriptors = splitHeader(line);
      current = {
        header: line,
        descriptors,
        names: [...new Set(descriptors.map(descriptorName))],
        workspace: descriptors.some((d) => d.includes("@workspace:")),
        version: null,
        body: [],
      };
      entries.push(current);
      continue;
    }

    if (!current) continue;
    current.body.push(line);
    const version = versionLine.exec(line);
    if (version && current.version === null) current.version = version[1];
  }

  return { format, entries };
}

/* Workspaces are skipped because Yarn 1 never lists them and Berry gives them
 * the placeholder version 0.0.0-use.local. */
function resolvedSet(text) {
  const set = new Set();
  for (const entry of parseLock(text).entries) {
    if (entry.workspace || entry.version === null) continue;
    for (const name of entry.names) set.add(`${name}@${entry.version}`);
  }
  return set;
}

module.exports = { descriptorName, parseLock, resolvedSet };
