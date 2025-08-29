import type { PageConfig, PageResult } from '@repo/mustache';
import MustacheRenderer from '@repo/mustache';
import {
  Dictionary,
  DictionaryConstantEntry,
  DictionaryEntry,
  DictionaryEntryGeneric,
  DictionarySyntaxEntry,
} from './PrimIndices.types';

const isDictionarySyntaxEntry = (
  entry: DictionaryEntry
): entry is DictionaryEntryGeneric<DictionarySyntaxEntry> => {
  return 'syntax' in entry.data;
};

const isDictionaryConstantEntry = (
  entry: DictionaryEntry
): entry is DictionaryEntryGeneric<DictionaryConstantEntry> => {
  return 'constants' in entry.data;
};

function getDictionaryEntryKeywords(entry: DictionaryEntry): string[] {
  const keywords = new Set<string>(['NetLogo', 'primitive']);
  keywords.add(entry.id);
  if (isDictionaryConstantEntry(entry)) {
    keywords.add('constant');
    entry.data.constants.forEach((constant) => {
      keywords.add(constant.name);
      if (constant.value) {
        keywords.add(constant.value);
      }
    });
  } else if (isDictionarySyntaxEntry(entry)) {
    keywords.add('syntax');
    entry.data.syntax.forEach((syntax) => keywords.add(syntax.name));
  }
  return Array.from(keywords);
}

export async function generatePrimitiveIndex(
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

  return results;
}

export async function generatePrimitiveIndices(
  dictionary: Dictionary,
  dictionaryDisplayName: string,
  dictionaryHomeDirectory: string,
  template: string,
  renderer: MustacheRenderer,
  buildVariables: Record<string, unknown> = {}
) {
  const allResults: PageResult[] = [];
  for (const entry of dictionary.entries) {
    const results = await generatePrimitiveIndex(
      entry,
      dictionaryDisplayName,
      dictionaryHomeDirectory,
      template,
      renderer,
      buildVariables
    );
    allResults.push(...results);
  }

  return allResults;
}
