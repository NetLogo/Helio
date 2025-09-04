import fs from 'fs/promises';

import type { ProjectConfig as MustacheProjectConfig } from '@repo/mustache';
import MustacheRenderer from '@repo/mustache';

import { generatePrimitiveIndex } from './PrimIndex';
import * as Constants from './constants';

export async function generateBetweenDirectoriesPages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
) {
  const buildResults = await renderer.build(sharedBuildVariables);
  return buildResults.pages;
}

export async function generateDictionaryPrimitivePages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
) {
  const dictionary = Constants.dictionary;
  return await generatePrimitiveIndex({
    dictionary,
    dictionaryDisplayName: `NetLogo ${sharedBuildVariables.version} Dictionary`,
    dictionaryHomeDirectory: 'dictionary',
    indexFileName: 'dict',
    template: Constants.primitiveIndexTemplate,
    renderer,
    buildVariables: sharedBuildVariables,
  });
}

export async function generateDictionary3DPrimitivePages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
) {
  const dictionary = Constants.dictionary3D;
  return await generatePrimitiveIndex({
    dictionary,
    dictionaryDisplayName: `NetLogo ${sharedBuildVariables.version} Dictionary 3D`,
    dictionaryHomeDirectory: '3d',
    indexFileName: 'dict3D',
    template: Constants.primitiveIndexTemplate,
    renderer,
    buildVariables: sharedBuildVariables,
  });
}

export async function generateMarkdownPages(config: MustacheProjectConfig) {
  const renderer = new MustacheRenderer(config);
  const buildVariables = {
    version: process.env['PRODUCT_VERSION'] || 'unknown',
    buildDate: new Date(
      process.env['PRODUCT_BUILD_DATE'] || Date.now()
    ).toISOString(),
  };

  const results = await Promise.all([
    generateBetweenDirectoriesPages(renderer, buildVariables),
    generateDictionaryPrimitivePages(renderer, buildVariables),
    generateDictionary3DPrimitivePages(renderer, buildVariables),
  ]).then((results) => {
    return results.reduce((obj, subset) => {
      Object.assign(obj, subset);
      return obj;
    }, {});
  });

  return results;
}

export async function generateMetadata(
  slug: string[],
  config: MustacheProjectConfig
) {
  const renderer = new MustacheRenderer(config);

  const slugPath = slug.join('/').replace(/\.html$/, '');
  const metadataPath = decodeURIComponent(
    renderer.getMetadataFilePath(slugPath)
  );

  try {
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    return {
      title: metadata.title || 'Documentation',
      description: metadata.description || 'Documentation page',
    };
  } catch (error) {
    console.error(`Failed to read metadata for slug: ${slugPath}`, error);
    return {
      title: 'Documentation',
      description: 'Documentation page',
    };
  }
}

export async function getPageContent(
  slug: string[],
  config: MustacheProjectConfig
) {
  const renderer = new MustacheRenderer(config);

  const slugPath = slug.join('/').replace(/\.html$/, '');
  const outputPath = decodeURIComponent(
    renderer.getOutputFilePath(slugPath, 'md')
  );

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
