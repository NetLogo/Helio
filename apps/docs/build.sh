#!/bin/bash
set -e
source .env

BUILD_DIR=site

rm -rf $BUILD_DIR && mkdir -p $BUILD_DIR

BASE_PATH="/$PRODUCT_VERSION" next build --turbopack
mv out "$BUILD_DIR/${PRODUCT_VERSION}"

next build --turbopack
mv out/** "$BUILD_DIR/"

rm -rf out