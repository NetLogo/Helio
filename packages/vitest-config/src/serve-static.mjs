// Serves a prerendered Nuxt site the way the production host resolves paths: the exact file, then <path>.html,
// then <path>/index.html. `nuxt preview` uses `serve`, which picks a same-named directory over <path>.html and 404s.
// Usage: node serve-static.mjs <dir> <port>
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const [root = ".output/public", port = "4100"] = process.argv.slice(2);
const base = resolve(root);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
};

const isFile = (path) => existsSync(path) && statSync(path).isFile();

function send(res, status, file) {
  res.writeHead(status, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  const target = normalize(join(base, pathname));
  if (!target.startsWith(base)) {
    res.writeHead(403).end();
    return;
  }
  for (const candidate of [target, `${target.replace(/\/$/, "")}.html`, join(target, "index.html")]) {
    if (isFile(candidate)) return send(res, 200, candidate);
  }
  const notFound = join(base, "404.html");
  if (isFile(notFound)) return send(res, 404, notFound);
  res.writeHead(404).end();
}).listen(Number(port), () => console.log(`Serving ${base} on http://localhost:${port}`));
