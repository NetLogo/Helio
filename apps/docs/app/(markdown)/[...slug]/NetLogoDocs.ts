import fs from 'fs/promises';

import type { ProjectConfig as MustacheProjectConfig, PageResult } from '@repo/mustache';
import MustacheRenderer from '@repo/mustache';

import type { PageMetadata } from '@repo/mustache/schemas';
import * as Dictionary from './(Dictionary)';
import * as ExtensionDocs from './(ExtensionDocs)';
import * as Constants from './constants';
import type { DocumentMetadata } from './NetLogoDocs.types';
import { DocumentMetadataSchema, MinimalDocumentMetadataSchema } from './NetLogoDocs.types';
import { generatePrimitiveIndex } from './PrimIndex';

export async function generateBetweenDirectoriesPages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
): Promise<Array<PageResult>> {
  const buildResults = await renderer.build(sharedBuildVariables);
  return Object.values(buildResults.pages);
}

export async function generateDictionaryPrimitivePages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
): Promise<Array<PageResult>> {
  const dictionary = Constants.dictionary;
  return await generatePrimitiveIndex({
    dictionary,
    dictionaryDisplayName: `NetLogo Dictionary`,
    dictionaryHomeDirectory: '/dictionary.html',
    primitivesDirectory: 'dict',
    indexFileName: 'dict',
    template: Constants.primitiveIndexTemplate,
    renderer,
    buildVariables: sharedBuildVariables,
    getEntryNames: Dictionary.getEntryNames,
  });
}

export async function generateDictionary3DPrimitivePages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
): Promise<Array<PageResult>> {
  const dictionary = Constants.dictionary3D;
  return await generatePrimitiveIndex({
    dictionary,
    dictionaryDisplayName: `Dictionary 3D`,
    dictionaryHomeDirectory: '/3d.html',
    primitivesDirectory: 'dict',
    indexFileName: 'dict3D',
    template: Constants.primitiveIndexTemplate,
    renderer,
    buildVariables: sharedBuildVariables,
    getEntryNames: Dictionary.getEntryNames,
  });
}

export async function generateMarkdownPages(
  config: MustacheProjectConfig
): Promise<Array<PageResult>> {
  const renderer = new MustacheRenderer(config);

  const handlebarsEngine = renderer.getNamedEngine('handlebars');
  if (!handlebarsEngine) {
    throw new Error(`
      Handlebars engine is not available in the renderer.
      Please ensure that the renderer is configured to use Handlebars as the template engine
      in autogen.config.ts.
    `);
  }

  handlebarsEngine.engine.registerHelper({
    netlogoDictionary: (options) => {
      // Types in Handlebars are not very well defined.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const context = options.data.root.dictionary as Dictionary.DictionaryType;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return options.fn(Dictionary.prebuild(context));
    },
  });

  const buildVariables = {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    version: process.env['PRODUCT_VERSION'] ?? 'unknown',
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    buildDate: new Date(process.env['PRODUCT_BUILD_DATE'] ?? Date.now()).toISOString(),
  };

  const results = await Promise.all([
    generateBetweenDirectoriesPages(renderer, buildVariables),
    generateDictionaryPrimitivePages(renderer, buildVariables),
    generateDictionary3DPrimitivePages(renderer, buildVariables),
    ExtensionDocs.buildDocs(),
  ]).then((res) => res.flat());

  return results;
}

export async function getPageMetadata(
  slug: Array<string>,
  config: MustacheProjectConfig
): Promise<DocumentMetadata> {
  const renderer = new MustacheRenderer(config);

  const slugPath = slug.join('/').replace(/\.html$/, '');
  const metadataPath = decodeURIComponent(renderer.getMetadataFilePath(slugPath));

  try {
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent) as PageMetadata;
    return DocumentMetadataSchema.parse({ ...metadata });
  } catch (error) {
    console.error(`Failed to read metadata for slug: ${slugPath}`, error);
    return MinimalDocumentMetadataSchema.parse({});
  }
}

export async function getPageContent(
  slug: Array<string>,
  config: MustacheProjectConfig
): Promise<{
  content: string | null;
  notFound?: boolean;
}> {
  const renderer = new MustacheRenderer(config);

  const slugPath = slug.join('/').replace(/\.html$/, '');
  const outputPath = decodeURIComponent(renderer.getOutputFilePath(slugPath, 'md'));

  try {
    const outputContent = await fs.readFile(outputPath, 'utf-8');
    return {
      content: outputContent,
    };
  } catch (error) {
    console.error(`Failed to read output for slug: ${slugPath}`, error);
    return {
      content: null,
      notFound: true,
    };
  }
}
