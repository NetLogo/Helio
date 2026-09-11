import { readFile, writeFile } from "node:fs/promises";

const LIBRARY_URL = "https://raw.githubusercontent.com/NetLogo/nettango-models/main/library.json";
const ASSET_BASE = "https://netlogoweb.org/assets/nt-modelslib/";
const BUILDER_URL = "https://netlogoweb.org/nettango-builder?netTangoModel=";
const TARGET = new URL("../app/data/models.json", import.meta.url);

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const firstParagraph = (info) =>
  info
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, " ")
    .trim();

const library = await fetch(LIBRARY_URL).then((res) => res.json());
const existing = JSON.parse(await readFile(TARGET, "utf8"));
const byId = new Map(existing.map((m) => [m.id, m]));
const local = existing.filter((m) => m.source !== "library");
const localIds = new Set(local.map((m) => m.id));

const synced = library.models
  .map((m) => {
    const id = slugify(m.name);
    const previous = byId.get(id) ?? {};
    return {
      id,
      title: m.name,
      description:
        firstParagraph(m.info) || `A NetTango blocks environment from the ${m.folder} collection.`,
      authors: ["Center for Connected Learning"],
      tags: [m.folder],
      thumbnail: `/models/${id}.webp`,
      animatedThumbnail: `/models/${id}.gif`,
      player: `/models/${id}.html`,
      project: ASSET_BASE + m.path,
      editor: BUILDER_URL + ASSET_BASE + m.path,
      ...(previous.frameHeight ? { frameHeight: previous.frameHeight } : {}),
      source: "library",
    };
  })
  .filter((m) => !localIds.has(m.id));

const FEATURED_ORDER = [
  "ants",
  "gpc",
  "rollypollies",
  "wolves-and-sheep",
  "sound-propagation",
  "thermal-equilibration",
  "watermelon-biodiversity",
  "fire",
  "disease",
  "simplified-disease",
  "slime-tutorial",
  "wolves-and-moose",
];
const rank = (m) => {
  const i = FEATURED_ORDER.indexOf(m.id);
  if (i >= 0) return i;
  return m.id.startsWith("antomology") ? 1000 : 100;
};
const ordered = [...local, ...synced].sort((a, b) => rank(a) - rank(b));

await writeFile(TARGET, JSON.stringify(ordered, null, 2) + "\n");
console.log(`kept ${local.length} local, synced ${synced.length} library models`);
