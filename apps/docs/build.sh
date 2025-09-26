#!/bin/bash
set -e
source .env

PUBLIC_DIR=public
BUILD_DIR=site

mv $PUBLIC_DIR _public
cp -r _public $PUBLIC_DIR

rm -rf $BUILD_DIR && mkdir -p $BUILD_DIR

BASE_PATH="/$PRODUCT_VERSION" next build --turbopack
mv out "$BUILD_DIR/${PRODUCT_VERSION}"

next build --turbopack
mv out/** "$BUILD_DIR/"

rm -rf out

rm -rf $PUBLIC_DIR
cp -r _public $PUBLIC_DIR