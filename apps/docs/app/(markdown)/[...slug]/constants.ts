import fs from 'fs';
import { Dictionary } from './PrimIndices.types';

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

export const dictionary: Dictionary = JSON.parse(dictionaryData);
export const dictionary3D: Dictionary = JSON.parse(dictionary3DData);
