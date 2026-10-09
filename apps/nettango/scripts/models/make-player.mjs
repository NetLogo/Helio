import { randomInt } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { findCodeTag, serializeProject } from "./extract.mjs";

const STORAGE_ID = /"storageId":"(ntb-\d{10})"/g;
const DEFAULT_TEMPLATE = fileURLToPath(
  new URL("../../public/assets/models/fire.html", import.meta.url),
);

export const takenStorageIds = (htmls) =>
  new Set(htmls.flatMap((html) => [...html.matchAll(STORAGE_ID)].map((match) => match[1])));

export function newStorageId(taken, digit = () => randomInt(10)) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const id = `ntb-${Array.from({ length: 10 }, digit).join("")}`;
    if (!taken.has(id)) return id;
  }
  throw new Error("could not draw an unused storageId");
}

export function makePlayer(templateHtml, project, storageId) {
  if ("storageId" in project) throw new Error("project already carries a storageId");
  const { id, start, end } = findCodeTag(templateHtml);
  if (id !== "nettango-code") throw new Error(`template uses the old ${id} tag; use a 7.x player`);
  const payload = serializeProject({ ...project, storageId });
  if (/<\/script/i.test(payload)) throw new Error("project JSON contains </script");
  return templateHtml.slice(0, start) + payload + templateHtml.slice(end);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const [input, output, template = DEFAULT_TEMPLATE] = process.argv.slice(2);
  if (!input) {
    console.error("usage: make-player.mjs MODEL.ntjson [OUT.html] [TEMPLATE.html]");
    process.exit(2);
  }
  const target = output ?? input.replace(/\.ntjson$/, ".html");
  const directory = dirname(target);
  const others = (await readdir(directory)).filter(
    (name) => name.endsWith(".html") && join(directory, name) !== target,
  );
  const taken = takenStorageIds(
    await Promise.all(others.map((name) => readFile(join(directory, name), "utf8"))),
  );
  const project = JSON.parse(await readFile(input, "utf8"));
  const storageId = newStorageId(taken);
  await writeFile(target, makePlayer(await readFile(template, "utf8"), project, storageId));
  console.log(`${basename(target)}: storageId ${storageId}`);
}
