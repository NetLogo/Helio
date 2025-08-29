import fs from 'fs/promises';

import type { ProjectConfig as MustacheProjectConfig } from '@repo/mustache';
import MustacheRenderer from '@repo/mustache';

import { generatePrimitiveIndices } from './PrimIndices';
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
  return await generatePrimitiveIndices(
    dictionary,
    `NetLogo ${sharedBuildVariables.version} Dictionary`,
    'dictionary',
    Constants.primitiveIndexTemplate,
    renderer,
    sharedBuildVariables
  );
}

export async function generateDictionary3DPrimitivePages(
  renderer: MustacheRenderer,
  sharedBuildVariables: Record<string, unknown> = {}
) {
  const dictionary = Constants.dictionary3D;
  return await generatePrimitiveIndices(
    dictionary,
    `NetLogo ${sharedBuildVariables.version} Dictionary 3D`,
    '3d',
    Constants.primitiveIndexTemplate,
    renderer,
    sharedBuildVariables
  );
}

export async function generateStaticParams(config: MustacheProjectConfig) {
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

  const generatedSlugs = Object.values(results)
    .filter((page) => page.success)
    .map((page) => page.baseName)
    .map((slug) => ({ slug: slug.split('/') }))
    .reduce(
      (acc, { slug }) => {
        acc.push({ slug });
        acc.push({
          slug: [...slug.slice(0, -1), slug.at(-1) + '.html'],
        });
        return acc;
      },
      [] as { slug: string[] }[]
    );

  return generatedSlugs;
}

export async function generateMetadata(
  slug: string[],
  config: MustacheProjectConfig
) {
  const renderer = new MustacheRenderer(config);

  const slugPath = slug.join('/').replace(/\.html$/, '');
  const metadataPath = renderer.getMetadataFilePath(slugPath);

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
  const outputPath = renderer.getOutputFilePath(slugPath, 'md');

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
