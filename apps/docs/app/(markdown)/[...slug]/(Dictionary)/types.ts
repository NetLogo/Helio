type DictionarySyntax = {
  name: string;
  since?: string;
  deprecated?: boolean;
};

type DictionaryExample = {
  code: string;
  since?: string;
};

type DictionarySyntaxEntry = {
  syntax: Array<DictionarySyntax>;
  description: string; // Markdown
  examples: Array<DictionaryExample>;
  initial?: number;
};

type DictionaryConstant = {
  name: string;
  value?: string;
};

type DictionaryConstantEntry = {
  title: string;
  constants: Array<DictionaryConstant>;
};

type DictionaryCategory = {
  title: string;
  id: string;
  subcategory?: DictionaryCategory;
};

type DictionaryEntryGeneric<T> = {
  id: string;
  entry_categories?: Array<DictionaryCategory>;
  data: T;
  icons: Array<Array<string>>;
};

type DictionaryEntry =
  | DictionaryEntryGeneric<DictionarySyntaxEntry>
  | DictionaryEntryGeneric<DictionaryConstantEntry>;

type DictionaryType = {
  created_at?: Date;
  updated_at?: Date;
  entries: Array<DictionaryEntry>;
};

class DictionaryClass implements DictionaryType {
  public created_at: Date = new Date();
  public updated_at: Date = new Date();
  public entries: Array<DictionaryEntry> = [];

  public getEntryById(entryId: string): DictionaryEntry | undefined {
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
