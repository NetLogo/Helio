interface DictionarySyntax {
  name: string;
  since?: string;
  deprecated?: boolean;
}

interface DictionaryExample {
  code: string;
  since?: string;
}

interface DictionarySyntaxEntry {
  syntax: Array<DictionarySyntax>;
  description: string; // Markdown
  examples: Array<DictionaryExample>;
  initial?: number;
}

interface DictionaryConstant {
  name: string;
  value?: string;
}

interface DictionaryConstantEntry {
  title: string;
  constants: Array<DictionaryConstant>;
}

interface DictionaryCategory {
  title: string;
  id: string;
  subcategory?: DictionaryCategory;
}

interface DictionaryEntryGeneric<T> {
  id: string;
  entry_categories: Array<DictionaryCategory>;
  data: T;
  icons: Array<Array<string>>;
}

type DictionaryEntry =
  | DictionaryEntryGeneric<DictionarySyntaxEntry>
  | DictionaryEntryGeneric<DictionaryConstantEntry>;

interface DictionaryType {
  created_at?: Date;
  updated_at?: Date;
  entries: Array<DictionaryEntry>;
}

class DictionaryClass implements DictionaryType {
  created_at: Date = new Date();
  updated_at: Date = new Date();
  entries: Array<DictionaryEntry> = [];

  getEntryById(entryId: string): DictionaryEntry | undefined {
    return this.entries.find((entry) => entry.id === entryId);
  }
}

export type {
  DictionaryCategory,
  DictionaryClass,
  DictionaryConstant,
  DictionaryConstantEntry,
  DictionaryEntry,
  DictionaryEntryGeneric,
  DictionaryExample,
  DictionarySyntax,
  DictionarySyntaxEntry,
  DictionaryType,
};

export default DictionaryClass;
