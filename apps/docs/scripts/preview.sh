#!/bin/bash

PORT=${PORT:-3002}

source scripts/.helpers
source .env
set -euo pipefail

if [ ! -d .build ]; then
  echo "Error: Build directory './build' does not exist. Please run the build script first."
  exit 1
fi

echo "💡 Starting preview server for built documentation..."

rm -rf .preview || true
mkdir .preview
cp -r .build/* .preview/
cd .preview
if [ -d latest ]; then
  unroll latest
fi
npx serve .preview -l $PORT
