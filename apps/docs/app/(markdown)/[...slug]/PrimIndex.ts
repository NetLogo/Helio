import fs from 'fs';
import path from 'path';

import type { PageConfig, PageResult } from '@repo/mustache';
import MustacheRenderer from '@repo/mustache';
import { saveToPublicDir } from '@repo/next-utils/files';
import { PrimitiveCatalogProps } from './(PrimitiveCatalog)/types';

export async function generatePrimitiveIndexEntry(
  source: PrimIndexEntry,
  dictionaryDisplayName: string,
  dictionaryHomeDirectory: string,
  primitivesDirectory: string,
  template: string,
  renderer: MustacheRenderer,
  buildVariables: Record<string, unknown> = {},
  indexOutputURI: string,
  currentItemLabel: string
) {
  const reactRenderMetadata: PrimitiveCatalogProps = {
    dictionaryDisplayName,
    dictionaryHomeDirectory,
    indexFileURI: `/generated/${indexOutputURI}.txt`,
    currentItemId: source.id,
    currentItemLabel: currentItemLabel,
  };
  const configuration: Partial<PageConfig> = {
    title: `${dictionaryDisplayName}: ${source.id}`,
    description: `Documentation for the ${source.id} primitive.`,
    output: true,

    layout: 'catalog',
    ...reactRenderMetadata,
  };

  const results = await renderer.buildFromConfiguration(
    [configuration],
    path.join(primitivesDirectory, source.id),
    template,
    {
      entry: source,
      dictionaryHome: `${dictionaryHomeDirectory}.html`,
      dictionaryDisplayName,
      ...buildVariables,
    }
  );

  return results;
}

export async function generatePrimitiveIndex<T extends PrimIndexEntry>({
  dictionary,
  dictionaryDisplayName,
  dictionaryHomeDirectory,
  primitivesDirectory,
  indexFileName,
  template,
  renderer,
  buildVariables,
  getEntryNames,
}: {
  dictionary: PrimDictionary<T>;
  dictionaryDisplayName: string;
  dictionaryHomeDirectory: string;
  primitivesDirectory?: string;
  indexFileName: string;
  template: string;
  renderer: MustacheRenderer;
  buildVariables: Record<string, unknown>;
  getEntryNames: (entry: T) => Array<string>;
}) {
  const allResults: Array<PageResult> = [];
  const primitiveIndex: Array<readonly [string, string]> = [];

  const primitiveDir = primitivesDirectory ?? dictionaryHomeDirectory;
  const indexOutputPath = path.join(renderer.paths.outputRoot, `${indexFileName}.txt`);
  if (!fs.existsSync(path.dirname(indexOutputPath))) {
    fs.mkdirSync(path.dirname(indexOutputPath), { recursive: true });
  }

  for (const entry of dictionary.entries) {
    const entryNames = getEntryNames(entry);
    const currentItemLabel = entryNames.join(', ');
    const result = await generatePrimitiveIndexEntry(
      entry,
      dictionaryDisplayName,
      dictionaryHomeDirectory,
      primitiveDir,
      template,
      renderer,
      buildVariables,
      indexFileName,
      currentItemLabel
    );

    primitiveIndex.push(...entryNames.map((name) => [name, entry.id + '.html'] as const));

    allResults.push(...result);
  }

  const indexFileContent = primitiveIndex.map((e) => e.join(' ')).join('\n');
  await fs.promises.writeFile(indexOutputPath, indexFileContent, 'utf-8');

  saveToPublicDir(['generated', indexFileName + '.txt'], indexFileContent);

  return allResults;
}

export interface PrimIndexEntry {
  id: string;
}

export interface PrimDictionary<T extends PrimIndexEntry> {
  entries: Array<T>;
}
