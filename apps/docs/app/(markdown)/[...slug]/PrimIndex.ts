import fs from 'fs';
import path from 'path';

import type { PageConfig, PageResult } from '@repo/mustache';
import MustacheRenderer from '@repo/mustache';

import * as Dictionary from './Dictionary';
import type { DictionaryEntry, DictionaryType } from './Dictionary.types';

export async function generatePrimitiveIndexEntry(
  source: DictionaryEntry,
  dictionaryDisplayName: string,
  dictionaryHomeDirectory: string,
  template: string,
  renderer: MustacheRenderer,
  buildVariables: Record<string, unknown> = {}
) {
  const configuration: Partial<PageConfig> = {
    title: `${dictionaryDisplayName}: ${source.id}`,
    description: `Documentation for the ${source.id} primitive.`,
    keywords: getDictionaryEntryKeywords(source),
    output: true,
  };

  const results = await renderer.buildFromConfiguration(
    [configuration],
    `${dictionaryHomeDirectory}/${source.id}`,
    template,
    {
      entry: source,
      dictionaryHome: `${dictionaryHomeDirectory}.html`,
      dictionaryDisplayName,
      ...buildVariables,
    }
  );

  return results.at(0)!;
}

export async function generatePrimitiveIndex({
  dictionary,
  dictionaryDisplayName,
  dictionaryHomeDirectory,
  indexFileName,
  template,
  renderer,
  buildVariables,
}: {
  dictionary: DictionaryType;
  dictionaryDisplayName: string;
  dictionaryHomeDirectory: string;
  indexFileName: string;
  template: string;
  renderer: MustacheRenderer;
  buildVariables: Record<string, unknown>;
}) {
  const allResults: PageResult[] = [];
  const primitiveIndex: Array<readonly [string, string]> = [];

  for (const entry of dictionary.entries) {
    const result = await generatePrimitiveIndexEntry(
      entry,
      dictionaryDisplayName,
      dictionaryHomeDirectory,
      template,
      renderer,
      buildVariables
    );

    primitiveIndex.push(
      ...Dictionary.getEntryNames(entry).map(
        (name) => [name, entry.id + '.html'] as const
      )
    );

    allResults.push(result);
  }

  const outputPath = path.join(
    renderer.paths.outputRoot,
    `${indexFileName}.txt`
  );
  await fs.promises.writeFile(
    outputPath,
    primitiveIndex.map((e) => e.join(' ')).join('\n'),
    'utf-8'
  );

  return allResults;
}

function getDictionaryEntryKeywords(entry: DictionaryEntry): string[] {
  const keywords = new Set<string>(['NetLogo', 'primitive']);
  keywords.add(entry.id);
  if (Dictionary.isConstantEntry(entry)) {
    keywords.add('constant');
    entry.data.constants.forEach((constant) => {
      keywords.add(constant.name);
      if (constant.value) {
        keywords.add(constant.value);
      }
    });
  } else if (Dictionary.isSyntaxEntry(entry)) {
    keywords.add('syntax');
    entry.data.syntax.forEach((syntax) => keywords.add(syntax.name));
  }
  return Array.from(keywords);
}
