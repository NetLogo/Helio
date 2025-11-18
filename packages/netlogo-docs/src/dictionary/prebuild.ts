import { toSlug } from "../helpers";
import type { DictionaryType } from "./types";
import { getEntryAdditionalNames, getEntryTitle } from "./utils";

type Category = {
  id: string;
  title: string;
  entries: Array<{
    id: string;
    name: string;
    additional_names: Array<string>;
  }>;
};
type FullDictionary = DictionaryType &
  Partial<{
    categories: Array<Category>;
    keywords: Partial<Category> & Pick<Category, "entries">;
    constants: Partial<Category> & Pick<Category, "entries">;
    variables: Array<Category>;
  }>;

export function prebuild(_dictionary: DictionaryType): Required<FullDictionary> {
  const dictionary: FullDictionary = { ..._dictionary };
  const categories: Record<string, Category> = {};

  for (const entry of dictionary.entries) {
    const value = {
      id: toSlug(entry.id),
      name: getEntryTitle(entry),
      additional_names: getEntryAdditionalNames(entry),
    };

    const entryCategories = entry.entry_categories ?? [];
    for (const category of entryCategories) {
      const categoryId = category.id;
      categories[categoryId] ??= {
        ...category,
        entries: [],
      };
      categories[categoryId].entries.push(value);
    }
  }

  // Remove special categories
  const categoriesCopy = { ...categories };
  delete categoriesCopy["variables"];
  delete categoriesCopy["constants"];
  delete categoriesCopy["keywords"];
  dictionary.categories = Object.values(categoriesCopy);

  // Order the categories based on the desired display
  // order
  const categoryTitleOrder = [
    "Turtle-related",
    "Patch-related",
    "Link-related",
    "Agentset",
    "Color",
    "Control Flow and Logic",
    "Anonymous Procedures",
    "World",
    "Perspective",
    "HubNet",
    "Input/Output",
    "File",
    "List",
    "String",
    "Mathematical",
    "Plotting",
    "BehaviorSpace",
    "System",
  ];

  dictionary.categories = dictionary.categories.sort(
    (a, b) => categoryTitleOrder.indexOf(a.title) - categoryTitleOrder.indexOf(b.title),
  );

  // Create fields for special categories
  dictionary.keywords = categories["keywords"] ?? categories["Keywords"] ?? { entries: [] };
  dictionary.constants = categories["constants"] ?? categories["Constants"] ?? { entries: [] };

  const dictionaryVariables: Record<string, Category> = {};
  for (const entry of dictionary.entries) {
    const value = {
      id: toSlug(entry.id),
      name: getEntryTitle(entry),
      additional_names: getEntryAdditionalNames(entry),
    };

    const entryCategories = entry.entry_categories ?? [];
    entryCategories.forEach((category) => {
      if (category.id !== "variables") return;
      const subcategory = category.subcategory;
      if (!subcategory) return;
      const subcategoryId = subcategory.id;

      dictionaryVariables[subcategoryId] ??= {
        ...subcategory,
        entries: [],
      };

      dictionaryVariables[subcategoryId].entries.push(value);
    });
  }

  dictionary.variables = Object.values(dictionaryVariables);

  return dictionary as Required<FullDictionary>;
}
