#!/bin/bash

set -e

packages=(
  "packages/utils",
  "packages/template",
  "packages/vue-ui",
  "packages/markdown",
  "packages/nuxt-content-assets",
)

for package in "${packages[@]}"; do
  echo "Building package: $package"
  (cd "$package" && yarn install && yarn run build)
done
