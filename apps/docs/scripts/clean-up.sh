#!/bin/bash

source .env
set -euo pipefail

echo "💡 Removing all build artifacts..."
targets=(.build .repo .output .preview .build-static)
for target in "${targets[@]}"; do
  if [ -d "$target" ]; then
    rm -rf "$target"
    echo "  🚀 Removed $target directory."
  else
    echo "  ℹ️  $target directory does not exist, skipping."
  fi
done

rm .stdout.log 2>/dev/null || true
rm .stderr.log 2>/dev/null || true
