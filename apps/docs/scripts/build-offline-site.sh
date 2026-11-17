#!/bin/bash
# Description: Script to generate offline (file://) html files
#              for the bundled version of the docs site.
source .env
source ${BASH_SOURCE%/*}/../../../scripts/.helpers

TARGET_DIR="$(pwd)/.build"

DOCS_ENV_STATIC=1 yarn run nuxt:generate

mkdir -p "$TARGET_DIR/latest"
upsert_dir .output/public "$TARGET_DIR/latest"

yarn run docs:generate-manual
