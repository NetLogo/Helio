import type TemplateRenderer from "@repo/template";
import type { PageResult } from "@repo/template";

import { getEntryNames } from "@repo/netlogo-docs/dictionary";
import { saveNavigationMetadata } from "@repo/netlogo-docs/helpers-node";
import { generatePrimitiveIndex } from "@repo/netlogo-docs/primitive-index";

import * as Constants from "./constants";

export async function generateBetweenDirectoriesPages(
  renderer: TemplateRenderer,
  sharedBuildVariables: Record<string, unknown> = {},
): Promise<Array<PageResult>> {
  const buildResults = await renderer.build(sharedBuildVariables);
  const metadata = { title: "NetLogo Documentation" };
  saveNavigationMetadata(metadata, renderer.paths.outputRoot);
  return Object.values(buildResults.pages);
}

export async function generateDictionaryPrimitivePages(
  renderer: TemplateRenderer,
  sharedBuildVariables: Record<string, unknown> = {},
): Promise<Array<PageResult>> {
  const dictionary = Constants.dictionary;
  return await generatePrimitiveIndex({
    dictionary,
    dictionaryDisplayName: `NetLogo Dictionary`,
    dictionaryHomeDirectory: "/dictionary.html",
    primitivesDirectory: "dict",
    indexFileName: "dict",
    template: Constants.primitiveIndexTemplate,
    renderer,
    buildVariables: sharedBuildVariables,
    metaVariables: { icon: Constants.dictionaryIcon },
    getEntryNames: getEntryNames,
  });
}

export async function generateDictionary3DPrimitivePages(
  renderer: TemplateRenderer,
  sharedBuildVariables: Record<string, unknown> = {},
): Promise<Array<PageResult>> {
  const dictionary = Constants.dictionary3D;
  return await generatePrimitiveIndex({
    dictionary,
    dictionaryDisplayName: `NetLogo 3D Dictionary`,
    dictionaryHomeDirectory: "/3d.html",
    primitivesDirectory: "dict",
    indexFileName: "dict3D",
    template: Constants.primitiveIndexTemplate,
    renderer,
    buildVariables: sharedBuildVariables,
    metaVariables: { icon: Constants.dictionary3DIcon },
    getEntryNames: getEntryNames,
  });
}

export * from "./schema";
