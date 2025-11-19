// @ts-check

import { isConstantEntry } from "@repo/netlogo-docs/dictionary";
import { parseAllFromText } from "@repo/netlogo-docs/extension-docs";
import { toSlug } from "@repo/netlogo-docs/helpers";

import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

const repoRoot = path.join(process.cwd(), "..", "..");
const docsDataPath = path.join(repoRoot, "apps", "docs", "autogen", "data");

const netlogoDesktopPrimitivesPath = path.join(docsDataPath, "dictionary.yaml");
const netlogo3DPrimitivesPath = path.join(docsDataPath, "dictionary-3D.yaml");

const extensionsDirPath = path.join(repoRoot, "external", "extensions");
const extensionsConfigFilename = "documentation.yaml";
const extensionsConfigPaths = fs
  .readdirSync(extensionsDirPath, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => path.join(extensionsDirPath, dirent.name, extensionsConfigFilename))
  .filter((filePath) => fs.existsSync(filePath));

/**
 *
 * @param {string} filePath
 * @returns {any} Parsed YAML content.
 */
function loadYAMLFile(filePath) {
  const fileContents = fs.readFileSync(filePath, "utf8");
  return yaml.parse(fileContents);
}

/**
 * Transforms a dictionary from the docs data into the standardized format.
 * @param {import("@repo/netlogo-docs/dictionary").DictionaryType} dictionary
 * @param {import("./primitives.types.js").Source} source
 * @param {(entry: import("@repo/netlogo-docs/dictionary").DictionaryEntry,
 *          source: import("./primitives.types.js").Source) => string} urlFunction
 * @returns {Array<import("./primitives.types.js").Primitive>} Transformed primitive entries.
 */
function transformDocsDictionary({ entries }, source, urlFunction) {
  return entries
    .map((entry) => {
      if (isConstantEntry(entry)) {
        return entry.data.constants.map((constant) => ({
          id: `${entry.id}-${constant.name}`,
          key: entry.id,
          name: constant.name,
          source: source,
          url: urlFunction(entry, source),
          isFromExtension: false,
          metadata: entry,
        }));
      } else {
        return entry.data.syntax.map((syntax) => ({
          id: `${entry.id}-${syntax.name}`,
          key: entry.id,
          name: syntax.name,
          source: source,
          url: urlFunction(entry, source),
          description: entry.data.description || "",
          examples: (entry.data.examples || []).map((example) => example.code) || [],
          isFromExtension: false,
          isConstant: false,
          metadata: entry,
        }));
      }
    })
    .flat();
}

/**
 *
 * @param {import("@repo/netlogo-docs/extension-docs").ExtensionConfig} config
 * @returns {Array<import("./primitives.types.js").Primitive>}
 */
function transformExtensionConfiguration({ extensionName, primitives }) {
  return primitives.map((primitive) => ({
    id: `${extensionName}-${primitive.name}`,
    key: `${extensionName}:${primitive.name}`,
    name: `${extensionName}:${primitive.name}`,
    alternateNames: [primitive.name],
    source: extensionName,
    isFromExtension: true,
    url: `https://docs.netlogo.org/${extensionName}/${toSlug(primitive.name)}.html`,
    metadata: { ...primitive },
  }));
}

function loadPrimitives() {
  /** @type {Array<import("./primitives.types.js").Primitive>} */
  let primitives = [];

  /** @type {import("@repo/netlogo-docs/dictionary").DictionaryType} */
  const netlogoDesktopDictionary = loadYAMLFile(netlogoDesktopPrimitivesPath);
  /** @type {import("@repo/netlogo-docs/dictionary").DictionaryType} */
  const netlogo3DDictionary = loadYAMLFile(netlogo3DPrimitivesPath);

  primitives = primitives.concat(
    [
      transformDocsDictionary(
        netlogoDesktopDictionary,
        "netlogo",
        (entry) => `https://docs.netlogo.org/dictionary.html#${toSlug(entry.id)}`,
      ),
      transformDocsDictionary(
        netlogo3DDictionary,
        "netlogo3D",
        (entry) => `https://docs.netlogo.org/3d.html#${toSlug(entry.id)}`,
      ),
    ].flat(),
  );

  console.info(`Loaded ${primitives.length} primitives from NetLogo dictionaries.`);

  for (const extConfigPath of extensionsConfigPaths) {
    const yamlRaw = fs.readFileSync(extConfigPath, "utf8");
    const extensionConfig = parseAllFromText(yamlRaw).documentation;
    if (!extensionConfig) continue;
    primitives = primitives.concat(transformExtensionConfiguration(extensionConfig));
  }

  return primitives;
}

/**
 *
 * @param {import("./primitives.types.js").Primitive[]} primitives
 * @param {string} outputPath
 */
function savePrimitivesYAML(primitives, outputPath) {
  const yamlContent = yaml.stringify({ primitives });
  fs.writeFileSync(outputPath, yamlContent, "utf8");
}

export function main() {
  const primitives = loadPrimitives();
  const outputPath = path.join(repoRoot, "packages", "common-data", "datasets", "primitives.yaml");
  savePrimitivesYAML(primitives, outputPath);

  const relativeOutputPath = path.relative(process.cwd(), outputPath);
  console.log(`Saved ${primitives.length} primitives to ${relativeOutputPath}`);
}
