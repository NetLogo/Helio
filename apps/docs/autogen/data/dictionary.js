import fs from 'fs/promises';
import yaml from 'yaml';

yaml;

const file = await fs.readFile('dictionary.yaml', 'utf8');
const dictionary = yaml.parse(file);

// Derive the categories field from the entries
const categories = {};
const getEntryKind = (entry) => {
  if (entry.data.constants) {
    return 'constant';
  }
  return 'syntax';
};
const getEntryName = (entry, kind) => {
  switch (kind) {
    case 'constant':
      return entry.data.title;
    case 'syntax':
      return entry.data.syntax?.[0].name;
    default:
      return '';
  }
};
const getEntryAdditionalNames = (entry, kind) => {
  switch (kind) {
    case 'constant':
      return entry.data.constants.map((c) => c.name) || [];
    case 'syntax':
      return entry.data.syntax?.slice(1).map((s) => s.name) || [];
    default:
      return [];
  }
};
for (const entry of dictionary.entries) {
  const kind = getEntryKind(entry);
  const value = {
    id: entry.id,
    name: getEntryName(entry, kind),
    additional_names: getEntryAdditionalNames(entry, kind),
  };

  const entryCategories = entry['entry_categories'] || [];
  for (const category of entryCategories) {
    const categoryId = category.id;
    if (!categories[categoryId]) {
      categories[categoryId] = {
        ...category,
        entries: [],
      };
    }
    categories[categoryId].entries.push(value);
  }
}

// Remove special categories
const categoriesCopy = { ...categories };
['Variables', 'Constants', 'Keywords'].forEach((excludedKey) => {
  delete categoriesCopy[excludedKey];
});
dictionary.categories = Object.values(categoriesCopy);

// Order the categories based on the desired display
// order
const categoryTitleOrder = [
  'Turtle-related',
  'Patch-related',
  'Link-related',
  'Agentset',
  'Color',
  'Control Flow and Logic',
  'Anonymous Procedures',
  'World',
  'Perspective',
  'HubNet',
  'Input/Output',
  'File',
  'List',
  'String',
  'Mathematical',
  'Plotting',
  'BehaviorSpace',
  'System',
];

dictionary.categories = dictionary.categories.sort(
  (a, b) => categoryTitleOrder.indexOf(a.title) - categoryTitleOrder.indexOf(b.title)
);

// Create fields for special categories
dictionary.keywords = categories['Keywords'] || { entries: [] };
dictionary.constants = categories['Constants'] || { entries: [] };

const dictionaryVariables = {};
for (const entry of dictionary.entries) {
  const kind = getEntryKind(entry);
  const value = {
    id: entry.id,
    name: getEntryName(entry, kind),
    additional_names: getEntryAdditionalNames(entry, kind),
  };

  const entryCategories = entry.entry_categories || [];
  entryCategories.forEach((category) => {
    if (category.id !== 'Variables') return;
    const subcategory = category.subcategory;
    const subcategoryId = subcategory.id;

    if (!dictionaryVariables[subcategoryId]) {
      dictionaryVariables[subcategoryId] = {
        ...subcategory,
        entries: [],
      };
    }

    dictionaryVariables[subcategoryId].entries.push(value);
  });
}

dictionary.variables = Object.values(dictionaryVariables);

console.log(JSON.stringify(dictionary));
