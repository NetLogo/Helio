import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const outDir = path.join(publicDir, "assets", "og");
const SIZE = 512;

const models = JSON.parse(await readFile(path.join(root, "app", "data", "models.json"), "utf8"));

const mtime = async (file) => (await stat(file).catch(() => null))?.mtimeMs ?? 0;

await mkdir(outDir, { recursive: true });

let written = 0;
for (const model of models) {
  if (!model.thumbnail) continue;
  const source = path.join(publicDir, model.thumbnail);
  const target = path.join(outDir, `${model.id}.jpg`);
  if ((await mtime(target)) >= (await mtime(source))) continue;
  await sharp(source)
    .resize(SIZE, SIZE, { fit: "cover" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(target);
  written += 1;
}

console.log(`og thumbnails: ${written} written, ${models.length - written} up to date, in ${path.relative(root, outDir)}`);
