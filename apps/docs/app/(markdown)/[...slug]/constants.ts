import fs from 'fs';
import yaml from 'yaml';

import type { DictionaryType } from './(Dictionary)/types';

export const primitiveIndexTemplate = fs.readFileSync('autogen/primIndex.md', 'utf-8');
export const dictionaryData = fs.readFileSync('autogen/data/dictionary.yaml', 'utf-8');
export const dictionary3DData = fs.readFileSync('autogen/data/dictionary-3d.yaml', 'utf-8');

export const dictionary: DictionaryType = yaml.parse(dictionaryData) as unknown as DictionaryType;
export const dictionary3D: DictionaryType = yaml.parse(
  dictionary3DData
) as unknown as DictionaryType;
