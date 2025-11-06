#!/bin/bash

source .env
source scripts/.helpers
set -euoa pipefail

ALLOW_SCRIPT_ELEMENTS=${ALLOW_SCRIPT_ELEMENTS:-"false"}
if [ $ALLOW_SCRIPT_ELEMENTS = "true" ]; then
  echo "⚠️   Warning: Script elements will be allowed in the static site. This will not work as intended."
else
  echo "ℹ️  Info: Script elements will be removed from the static site."
fi

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <build-directory> <target-directory>"
  exit 1
fi

extensions=$(find $REPO_ROOT/external/extensions -name documentation.yaml | awk -F'/' '{print $(NF-1)}' | paste -sd' ' -)

buildDir="$1"
targetDir="$2"

if [ ! -d "$buildDir" ]; then
  echo "❌ Build directory does not exist: $buildDir"
  exit 1
fi

if [ -d "$targetDir" ]; then
  echo "💬 Target directory already exists, removing: $targetDir"
  rm -rf "$targetDir"
fi

cp -r "$buildDir" "$targetDir"

for ext in $extensions; do
  extDir="$targetDir/$ext"
  if [ -d "$extDir" ]; then
    echo "🗑️ Removing extension directory from static site: $extDir"
    rm -rf "$extDir"
  fi
done
if [ ! $ALLOW_SCRIPT_ELEMENTS = "true" ]; then
  echo "🗑️ Removing script elements from static site."
  find "$targetDir" -name "*.js" -type f -delete
fi
unwantedDirs=("__og-image__", "__sitemap__", "dict")
for dir in "${unwantedDirs[@]}"; do
  if [ -d "$targetDir/$dir" ]; then
    echo "🗑️ Removing unwanted directory from static site: $dir"
    rm -rf "$targetDir/$dir"
  fi
done

echo "🗑️ Removing payloads from static site"
find "$targetDir" -type f -name "_payload.json" -delete

echo "🗑️ Removing empty directories from static site"
find "$targetDir" -type d -empty -delete

echo "✅ Copied static site from $buildDir to $targetDir"

node scripts/make-static/index.cjs "$targetDir"

exit 0
