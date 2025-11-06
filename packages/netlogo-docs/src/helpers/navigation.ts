import fs from "fs";
import path from "path";
import yaml from "yaml";

const FILE_NAME = ".navigation.yml";

export function saveNavigationMetadata(metadata: Record<string, unknown>, dir: string) {
  const yamlContent = yaml.stringify(metadata);
  const filePath = path.join(dir, FILE_NAME);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, yamlContent, "utf-8");
}
