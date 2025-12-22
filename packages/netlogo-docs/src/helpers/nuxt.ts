import { PageMetadata } from "@repo/template/schemas";
import path from "path";
export function appendAssetsRootToMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const scanRoot = (metadata as PageMetadata).projectConfig.scanRoot;
  const slash = path.sep;
  const isScanRootRelative = typeof scanRoot === "string" && !scanRoot.startsWith(slash);
  const assetsRoot = isScanRootRelative
    ? path.join(process.cwd(), ...scanRoot.split(slash))
    : path.join(slash, ...(scanRoot?.split(slash).slice(1) ?? []));

  metadata["assetsRoot"] = assetsRoot;
  return metadata;
}

export function addNuxtContentAssetsRoot(
  file: { body: string; assetsRoot?: string },
  fallbackRoute?: string,
): void {
  const keyword = "assetsRoot: ";
  const index = file.body.indexOf(keyword);
  if (index !== -1) {
    const line = file.body.split("\n").find((line) => line.includes(keyword));
    if (line) {
      const assetsRoot = line.split(": ")[1];
      file.assetsRoot = assetsRoot;
    }
  } else if (fallbackRoute) {
    file.assetsRoot = fallbackRoute;
    console.info(`No assetsRoot found. Using fallback route: ${fallbackRoute}`);
  } else {
    console.log(`No assetsRoot found.`);
  }
}
