const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");

const ourHosts = [
  "modelingcommons.org",
  "*.modelingcommons.org",
  "netlogoweb.org",
  "*.netlogoweb.org",
  "netlogo.org",
  "*.netlogo.org",
  "ccl.northwestern.edu",
];

function main() {
  const repoRoot = path.join(process.cwd(), "..", "..");
  const outputPath = path.join(repoRoot, "packages", "common-data", "datasets", "our-hosts.yaml");
  const yamlContent = yaml.stringify({ ourHosts });
  fs.writeFileSync(outputPath, yamlContent, "utf8");

  const relativeOutputPath = path.relative(process.cwd(), outputPath);
  console.log(`Saved ${ourHosts.length} hosts to ${relativeOutputPath}`);

  return ourHosts.length;
}

module.exports = {
  main,
};
