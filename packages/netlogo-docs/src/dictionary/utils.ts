import { prebuild } from "./prebuild";
import type {
  DictionaryConstantEntry,
  DictionaryEntry,
  DictionaryEntryGeneric,
  DictionarySyntaxEntry,
  DictionaryType,
} from "./types";

export const isSyntaxEntry = (
  entry: DictionaryEntry,
): entry is DictionaryEntryGeneric<DictionarySyntaxEntry> => {
  return "syntax" in entry.data;
};

export const isConstantEntry = (
  entry: DictionaryEntry,
): entry is DictionaryEntryGeneric<DictionaryConstantEntry> => {
  return "constants" in entry.data;
};

export const getEntryKind = (entry: DictionaryEntry): "constant" | "syntax" | "unknown" => {
  if (isConstantEntry(entry)) {
    return "constant";
  } else if (isSyntaxEntry(entry)) {
    return "syntax";
  }
  return "unknown";
};

export const getEntryTitle = (entry: DictionaryEntry): string => {
  if (isConstantEntry(entry)) {
    return entry.data.title;
  } else if (isSyntaxEntry(entry)) {
    return entry.data.syntax.at(0)?.name ?? "Untitled";
  }
  return "Untitled";
};

export const getEntryNames = (entry: DictionaryEntry): Array<string> => {
  if (isConstantEntry(entry)) {
    return entry.data.constants.map((c) => c.name);
  } else if (isSyntaxEntry(entry)) {
    return entry.data.syntax.map((s) => s.name);
  }
  return [];
};

export const getEntryAdditionalNames = (entry: DictionaryEntry): Array<string> => {
  if (isConstantEntry(entry)) {
    return entry.data.constants.map((c) => c.name);
  } else if (isSyntaxEntry(entry)) {
    return entry.data.syntax.slice(1).map((s) => s.name);
  }
  return [];
};

export function prebuildHandlebarsHelper(options: {
  data: { root: { dictionary?: DictionaryType } };
  fn: (context: ReturnType<typeof prebuild>) => string;
}): string {
  // Types in Handlebars are not very well defined.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const context = options.data.root.dictionary;
  if (context === undefined) {
    throw new Error("No dictionary context provided to prebuild helper");
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return options.fn(prebuild(context));
}
