const fs = require('fs');
const path = require('path');

// Read environment variables
const productVersion = process.env.PRODUCT_VERSION;
const productDisplayName = process.env.PRODUCT_DISPLAY_NAME;
const buildLatest = process.env.BUILD_LATEST === 'true';

console.log('Product Version:', productVersion);
console.log('Build Latest:', buildLatest);

if (!productVersion) {
  console.error('Error: PRODUCT_VERSION environment variable is not set');
  process.exit(1);
}

if (!productDisplayName) {
  console.error('Error: PRODUCT_DISPLAY_NAME environment variable is not set');
  process.exit(1);
}

const versionsPath = path.join(process.cwd(), 'versions.json');

// Read existing versions.json or create empty array
let versions = [];
if (fs.existsSync(versionsPath)) {
  try {
    const content = fs.readFileSync(versionsPath, 'utf8');
    versions = JSON.parse(content);
  } catch (error) {
    console.error('Error reading versions.json:', error);
    process.exit(1);
  }
}

// Find existing version entry
const existingIndex = versions.findIndex((v) => v.version === productVersion);
const buildTime = new Date().toISOString();

// Create or update version entry
const versionEntry = {
  // Compatibility fields
  name: productDisplayName,
  value: productVersion,
  // Main fields
  version: productVersion,
  dir: `${productVersion}/`,
  displayName: productDisplayName,
  buildTime: buildTime,
  latest: buildLatest,
  // Commit hashes for traceability
  commitHash: process.env.COMMIT_HASH || null,
  buildRepoCommitHash: process.env.BUILD_REPO_COMMIT_HASH || null,
};

if (existingIndex >= 0) {
  // Update existing entry
  versions[existingIndex] = versionEntry;
  console.log(`Updated version ${productVersion}`);
} else {
  // Add new entry at TOP
  versions.unshift(versionEntry);
  console.log(`Added new version ${productVersion}`);
}

// If this version is marked as latest, unmark all others
if (buildLatest) {
  versions = versions.map((v) => ({
    ...v,
    latest: v.version === productVersion,
  }));
}

// Sort versions by version number (descending)
versions.sort((a, b) => {
  const aNum = parseFloat(a.version);
  const bNum = parseFloat(b.version);
  return bNum - aNum;
});

// Write updated versions.json
try {
  fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n', 'utf8');
  console.log('Successfully updated versions.json');
  console.log(JSON.stringify(versions, null, 2));
} catch (error) {
  console.error('Error writing versions.json:', error);
  process.exit(1);
}
