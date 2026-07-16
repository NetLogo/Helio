import TemplateRenderer from "@repo/template";

import config from "./autogen.config";

import { prebuildHandlebarsHelper } from "@repo/netlogo-docs/dictionary";
import * as ExtensionDocs from "@repo/netlogo-docs/extension-docs";
import { generateRoutesFile } from "@repo/netlogo-docs/helpers-node";
import {
  generateBetweenDirectoriesPages,
  generateDictionary3DPrimitivePages,
  generateDictionaryPrimitivePages,
} from "./NetLogoDocs";

export default async function runDocsAutogen() {
  const renderer = new TemplateRenderer(config);
  const handlebarsEngine = renderer.getNamedEngine("handlebars");
  if (!handlebarsEngine) {
    throw new Error(`
      Handlebars engine is not available in the renderer.
      Please ensure that the renderer is configured to use Handlebars as the template engine
      in autogen.config.ts.
    `);
  }

  handlebarsEngine.engine.registerHelper({
    netlogoDictionary: prebuildHandlebarsHelper,
  });

  const version = process.env["PRODUCT_VERSION"] || "7.0.1";
  const buildVariables = {
    version: version,
    versionMajorMinor: version.match(/^\d+\.\d+/)?.[0],
    buildDate: process.env["PRODUCT_BUILD_DATE"] || new Date().toISOString(),
  };

  if (buildVariables.versionMajorMinor === null) {
    throw new Error("Failed to extract major and minor version number.");
  }

  const result = await Promise.all([
    generateBetweenDirectoriesPages(renderer, buildVariables),
    generateDictionaryPrimitivePages(renderer, buildVariables),
    generateDictionary3DPrimitivePages(renderer, buildVariables),
    ExtensionDocs.buildDocs(config),
  ]);

  await generateRoutesFile(renderer, result.flat());

  if (global.gc) {
    global.gc();
  }
}
