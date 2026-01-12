#!/bin/bash
# Description: Script to generate static files for multiple base paths

source .env                    # Load environment variables
source scripts/.helpers        # Load helper functions
set -euo pipefail              # Strict error handling

echo "⚙️  Starting generation of static files..."
echo "💡 You can check .stdout.log and .stderr.log for progress and errors."

processes_to_kill=(node yarn npm)
echo "⚠️  This script will kill all ${processes_to_kill[*]} processes."
for process in "${processes_to_kill[@]}"; do
  pgrep $process | xargs -r kill -9 >/dev/null 2>/dev/null || true
done
echo "✅ Killed specified processes."

if [ "${BUILD_LATEST:-false}" = "true" ]; then
  echo "💡 Building latest version in addition to ${PRODUCT_VERSION}"
else
  echo "💡 Building only version ${PRODUCT_VERSION}"
fi

TARGET_DIR="$(pwd)/.build"     # Define target directory for generated files

rm .stdout.log 2>/dev/null || true         # Clear previous logs
rm .stderr.log 2>/dev/null || true

rm -rf "$TARGET_DIR"           # Empty target directory
mkdir -p "$TARGET_DIR"
echo "🧹 Emptied target directory: $TARGET_DIR"

echo "💡 Preparing Nuxt for generation..."
npx nuxi cleanup >> .stdout.log 2>> .stderr.log
BASE_PATH="/" yarn run nuxt:prepare >> .stdout.log 2>> .stderr.log
echo "==== end of prepare step ====" >> .stdout.log
echo "" >> .stdout.log
echo "✅ Nuxt prepared."

if [ "$BUILD_LATEST" = "true" ]; then
  echo "💡 Building no-prefix version"
  # 1) Generate for base path "/"
  BASE_PATH="/" yarn run nuxt:generate >> .stdout.log 2>> .stderr.log

  # 2) Copy to "<TARGET_DIR>/latest"
  mkdir -p "$TARGET_DIR/latest"
  cp -R .output/public/* "$TARGET_DIR/latest"

  echo "==== end of previous build ====" >> .stdout.log
  echo "" >> .stdout.log

  echo "✅ Finished building latest version"
fi

echo "💡 Building version ${PRODUCT_VERSION}"

# 3) Generate for versioned path "/<PRODUCT_VERSION>/"
BASE_PATH="/$PRODUCT_VERSION/" yarn run nuxt:generate >> .stdout.log 2>> .stderr.log

# 4) Copy to "<TARGET_DIR>/<PRODUCT_VERSION>/"
mkdir -p "$TARGET_DIR/$PRODUCT_VERSION"
cp -R .output/public/* "$TARGET_DIR/$PRODUCT_VERSION"

echo "✅ Finished building version ${PRODUCT_VERSION}"

# 5) Clean up gitignore files
echo "🧹 Cleaning up .gitignore files..."
find "$TARGET_DIR" -name ".gitignore" -delete || true

echo "✅ Generation completed. Output is in $TARGET_DIR"
