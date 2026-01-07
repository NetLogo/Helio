#!/bin/sh

############################################################
# Run this script to initialize the project environment
# the first time after cloning the repository.
#
# Usage: yarn run init (in the repo root)
# or: sh scripts/initialize.sh
# Exit on error (except for git submodule command)
############################################################

set -e

NUXT_TELEMETRY_DISABLED=1

REPO_HOME=$(pwd)
if [ "$(basename $REPO_HOME)" = "scripts" ]; then
  REPO_HOME=$(dirname $REPO_HOME)
fi

git submodule update --init --recursive || true
yarn install --ignore-scripts --frozen-lockfile
yarn turbo run build
yarn install --force
yarn turbo run init
