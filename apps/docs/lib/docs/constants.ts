import type { DictionaryType } from '@repo/netlogo-docs/dictionary';
import fs from 'fs';
import yaml from 'yaml';

// We break many eslint rules here because this file is imported in both
// Node.js (for the autogen scripts) and in the browser (for the Nuxt app).
// Some of these rules are disabled for the entire repo, but some are only
// disabled here because they are too restrictive for this specific use case.
// - Omar I. (Oct 15 2025)

// eslint-disable-next-line import/no-mutable-exports
let primitiveIndexTemplate: string;
// eslint-disable-next-line import/no-mutable-exports
let dictionaryData: string;
// eslint-disable-next-line import/no-mutable-exports
let dictionary3DData: string;
// eslint-disable-next-line import/no-mutable-exports
let dictionary: DictionaryType;
// eslint-disable-next-line import/no-mutable-exports
let dictionary3D: DictionaryType;

if (import.meta.client !== true) {
  primitiveIndexTemplate = fs.readFileSync('autogen/primIndex.md', 'utf-8');
  dictionaryData = fs.readFileSync('autogen/data/dictionary.yaml', 'utf-8');
  dictionary3DData = fs.readFileSync('autogen/data/dictionary-3d.yaml', 'utf-8');

  dictionary = yaml.parse(dictionaryData) as unknown as DictionaryType;
  dictionary3D = yaml.parse(dictionary3DData) as unknown as DictionaryType;
}

export { dictionary, dictionary3D, dictionary3DData, dictionaryData, primitiveIndexTemplate };

export const dictionaryIcon = 'i-lucide-square-code';
export const dictionary3DIcon = 'i-lucide-move-3d';
