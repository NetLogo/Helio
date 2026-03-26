import type TemplateRenderer from "@repo/template";
import type { PageResult } from "@repo/template";
import fs from "fs/promises";
import { minimatch } from "minimatch";
import path from "path";
import { toSlug } from "../helpers/slugify";

export async function generateRoutesFile(
  renderer: TemplateRenderer,
  results: Array<PageResult>,
): Promise<void> {
  const routes = results
    .filter((page) => page.success)
    .map((page) => page.baseName.split("/").map(toSlug).join("/"))
    .map((basename) => "/" + basename);

  await fs.writeFile(
    path.join(renderer.paths.projectRoot, "routes.json"),
    JSON.stringify(routes, null, 2),
  );
}

export async function getRoutes(baseUrl: string = "/"): Promise<Array<string> | []> {
  const routesPath = path.join(process.cwd(), "routes.json");
  if (!Boolean(await fs.stat(routesPath).catch(() => false))) {
    console.warn("No routes.json file found");
    return ["/"];
  }
  const routesContent = await fs.readFile(routesPath, "utf-8");
  const routes = JSON.parse(routesContent) as Array<string>;
  if (baseUrl === "/") return routes;
  return routes
    .map((route) => (route.startsWith("/") ? route.slice(1) : route))
    .map((route) => baseUrl + route);
}

export async function getRoutesSubset(
  patterns: Array<string>,
  baseUrl: string = "/",
): Promise<Array<string>> {
  const routes = await getRoutes(baseUrl);
  return routes.filter((route) => patterns.some((pattern) => minimatch(route, pattern)));
}
