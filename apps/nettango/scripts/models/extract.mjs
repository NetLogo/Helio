import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const OPEN_TAG = /<script type="text\/json" id="(nettango-code|ntango-code)">/;
const CLOSE_TAG = "</script>";

export function findCodeTag(html) {
  const open = OPEN_TAG.exec(html);
  if (!open) throw new Error("no nettango-code or ntango-code script tag");
  const start = open.index + open[0].length;
  const end = html.indexOf(CLOSE_TAG, start);
  if (end < 0) throw new Error("unterminated code script tag");
  return { id: open[1], start, end };
}

export function extractProject(html) {
  const { start, end } = findCodeTag(html);
  const { storageId, ...project } = JSON.parse(html.slice(start, end));
  return { project, storageId };
}

export const serializeProject = (project) => JSON.stringify(project);

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const [input, output] = process.argv.slice(2);
  if (!input) {
    console.error("usage: extract.mjs PLAYER.html [OUT.ntjson]");
    process.exit(2);
  }
  const target = output ?? input.replace(/\.html$/, ".ntjson");
  const { project, storageId } = extractProject(await readFile(input, "utf8"));
  await writeFile(target, serializeProject(project));
  console.log(`${basename(target)}: extracted (player storageId ${storageId ?? "none"})`);
}
