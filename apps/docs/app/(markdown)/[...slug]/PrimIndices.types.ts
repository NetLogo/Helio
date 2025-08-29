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
  syntax: DictionarySyntax[];
  description: string; // Markdown
  examples: DictionaryExample[];
  initial: number;
}

interface DictionaryConstant {
  name: string;
  value?: string;
}

interface DictionaryConstantEntry {
  title: string;
  constants: DictionaryConstant[];
}

interface DictionaryCategory {
  title: string;
  id: string;
  subcategory?: DictionaryCategory;
}

interface DictionaryEntryGeneric<T> {
  id: string;
  entry_categories: DictionaryCategory[];
  data: T;
  icons: string[][];
  parsing_errors: string[];
}

type DictionaryEntry =
  | DictionaryEntryGeneric<DictionarySyntaxEntry>
  | DictionaryEntryGeneric<DictionaryConstantEntry>;

interface DictionaryEntryBrief {
  id: string;
  name: string;
  additional_names: string[];
}

interface DictionaryCategoryTree {
  title: string;
  id: string;
  entries: DictionaryEntryBrief[];
  subcategories: DictionaryCategoryTree[];
}

interface Dictionary {
  created_at: Date;
  updated_at: Date;
  entries: DictionaryEntry[];
  categories: DictionaryCategoryTree[];
}

class DictionaryClass implements Dictionary {
  created_at: Date = new Date();
  updated_at: Date = new Date();
  entries: DictionaryEntry[] = [];
  categories: DictionaryCategoryTree[] = [];

  getEntryById(entryId: string): DictionaryEntry | undefined {
    return this.entries.find((entry) => entry.id === entryId);
  }

  getCategoryById(categoryId: string): DictionaryCategoryTree | undefined {
    return this.categories.find((category) => category.id === categoryId);
  }
}

export type {
  Dictionary,
  DictionaryCategory,
  DictionaryCategoryTree,
  DictionaryClass,
  DictionaryConstant,
  DictionaryConstantEntry,
  DictionaryEntry,
  DictionaryEntryBrief,
  DictionaryEntryGeneric,
  DictionaryExample,
  DictionarySyntax,
  DictionarySyntaxEntry,
};

export default DictionaryClass;
