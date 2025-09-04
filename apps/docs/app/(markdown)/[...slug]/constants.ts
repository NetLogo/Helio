import fs from 'fs';
import { DictionaryType } from './Dictionary.types';

export const primitiveIndexTemplate = fs.readFileSync(
  'autogen/primIndex.md',
  'utf-8'
);
export const dictionaryData = fs.readFileSync(
  'autogen/data/dictionary.json',
  'utf-8'
);
export const dictionary3DData = fs.readFileSync(
  'autogen/data/dictionary-3d.json',
  'utf-8'
);

export const dictionary: DictionaryType = JSON.parse(dictionaryData);
export const dictionary3D: DictionaryType = JSON.parse(dictionary3DData);
