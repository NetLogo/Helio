import fs from "fs";
import path from "path";

import type TemplateRenderer from "@repo/template";
import type { PageConfig, PageResult } from "@repo/template";
import { saveToPublicDir } from "@repo/utils/lib/server";

import { toSlug } from "../helpers";
import { PrimitiveCatalogSchema, type PrimitiveCatalog } from "./types";

async function generatePrimitiveIndexEntry({
  source,
  dictionaryDisplayName,
  dictionaryHomeDirectory,
  primitivesDirectory,
  template,
  renderer,
  buildVariables = {},
  metaVariables = {},
  indexOutputURI,
  currentItemLabel,
}: {
  source: PrimIndexEntry;
  dictionaryDisplayName: string;
  dictionaryHomeDirectory: string;
  primitivesDirectory: string;
  template: string;
  renderer: TemplateRenderer;
  buildVariables?: Record<string, unknown>;
  metaVariables?: Record<string, unknown>;
  indexOutputURI: string;
  currentItemLabel: string;
}): Promise<Array<PageResult>> {
  const reactRenderMetadata: PrimitiveCatalog = {
    dictionaryDisplayName,
    dictionaryHomeDirectory,
    indexFileURI: indexOutputURI,
    currentItemId: source.id,
    currentItemLabel: currentItemLabel,
    primRoot: primitivesDirectory,
  };
  const configuration: Partial<PageConfig> = {
    title: `${dictionaryDisplayName}: ${source.id}`,
    description: `Documentation for the ${source.id} primitive.`,
    output: true,

    layout: "catalog",
    ...reactRenderMetadata,
    ...metaVariables,
  };

  const results = await renderer.buildFromConfiguration(
    [configuration],
    path.join(primitivesDirectory, source.id),
    template,
    {
      entry: source,
      dictionaryHome: dictionaryHomeDirectory,
      dictionaryDisplayName,
      ...buildVariables,
    },
  );

  return results;
}

function getIndexOutputPath(renderer: TemplateRenderer, indexFileName: string): string {
  const indexOutputPath = path.join(renderer.paths.outputRoot, `${indexFileName}.txt`);
  if (!fs.existsSync(path.dirname(indexOutputPath))) {
    fs.mkdirSync(path.dirname(indexOutputPath), { recursive: true });
  }
  return indexOutputPath;
}

function getIndexOutputURI(indexFileName: string): [Array<string>, string] {
  const parts = ["_index", indexFileName + ".txt"];
  const uri = "/" + parts.join("/");
  return [parts, uri];
}

async function generatePrimitiveIndex<T extends PrimIndexEntry>({
  dictionary,
  dictionaryDisplayName,
  dictionaryHomeDirectory,
  primitivesDirectory,
  indexFileName,
  template,
  renderer,
  buildVariables,
  metaVariables = {},
  getEntryNames,
}: {
  dictionary: PrimDictionary<T>;
  dictionaryDisplayName: string;
  dictionaryHomeDirectory: string;
  primitivesDirectory: string;
  indexFileName: string;
  template: string;
  renderer: TemplateRenderer;
  buildVariables?: Record<string, unknown>;
  metaVariables?: Record<string, unknown>;
  getEntryNames: (entry: T) => Array<string>;
}): Promise<Array<PageResult>> {
  const allResults: Array<PageResult> = [];
  const primitiveIndex: Array<readonly [string, string]> = [];

  const indexOutputPath = getIndexOutputPath(renderer, indexFileName);
  const [indexFilePathParts, indexOutputURI] = getIndexOutputURI(indexFileName);

  const sharedOpts = {
    dictionaryDisplayName,
    dictionaryHomeDirectory,
    primitivesDirectory,
    renderer,
    buildVariables,
    metaVariables,
    indexOutputURI,
  };

  for (const entry of dictionary.entries) {
    const entryNames = getEntryNames(entry);
    const currentItemLabel = entryNames.join(", ");
    const result = await generatePrimitiveIndexEntry({
      ...sharedOpts,
      source: entry,
      template,
      currentItemLabel,
    });
    primitiveIndex.push(...entryNames.map((name) => [name, toSlug(entry.id) + ".html"] as const));

    allResults.push(...result);
  }

  await generatePrimitiveIndexEntry({
    ...sharedOpts,
    source: { id: "dictionary" },
    template: "# {{ dictionaryDisplayName }}",
    currentItemLabel: "",
  });

  const indexFileContent = primitiveIndex.map((e) => e.join(" ")).join("\n");
  await fs.promises.writeFile(indexOutputPath, indexFileContent, "utf-8");

  saveToPublicDir(indexFilePathParts, indexFileContent);

  return allResults;
}

type PrimIndexEntry = {
  id: string;
};

type PrimDictionary<T extends PrimIndexEntry> = {
  entries: Array<T>;
};

export { generatePrimitiveIndex, generatePrimitiveIndexEntry, PrimitiveCatalogSchema };
export type { PrimDictionary, PrimIndexEntry, PrimitiveCatalog };
