import {
  DictionaryConstantEntry,
  DictionaryEntry,
  DictionaryEntryGeneric,
  DictionarySyntaxEntry,
} from './Dictionary.types';

export const isSyntaxEntry = (
  entry: DictionaryEntry
): entry is DictionaryEntryGeneric<DictionarySyntaxEntry> => {
  return 'syntax' in entry.data;
};

export const isConstantEntry = (
  entry: DictionaryEntry
): entry is DictionaryEntryGeneric<DictionaryConstantEntry> => {
  return 'constants' in entry.data;
};

export const getEntryTitle = (entry: DictionaryEntry) => {
  if (isConstantEntry(entry)) {
    return entry.data.title;
  } else if (isSyntaxEntry(entry)) {
    return entry.data.syntax.at(0)?.name;
  }
  return 'Untitled';
};

export const getEntryNames = (entry: DictionaryEntry) => {
  if (isConstantEntry(entry)) {
    return entry.data.constants.map((c) => c.name);
  } else if (isSyntaxEntry(entry)) {
    return entry.data.syntax.map((s) => s.name);
  }
  return [];
};

export const getEntryAdditionalNames = (entry: DictionaryEntry) => {
  if (isConstantEntry(entry)) {
    return entry.data.constants.map((c) => c.name);
  } else if (isSyntaxEntry(entry)) {
    return entry.data.syntax.slice(1).map((s) => s.name);
  }
  return [];
};
