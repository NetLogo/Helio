#!/bin/bash
# Deploy script for documentation
# This script follows the steps outlined in ./deploy.md

set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../../../scripts/.helpers"
source .env

require_env \
  "PROJECT_ROOT" \
  "BUILD_REPO" \
  "PRODUCT_VERSION" \
  "PRODUCT_DISPLAY_NAME" \
  "BUILD_LATEST" \
  "BUILD_BRANCH"

export PRODUCT_VERSION="${PRODUCT_VERSION}"
export PRODUCT_DISPLAY_NAME="${PRODUCT_DISPLAY_NAME}"
export BUILD_LATEST="${BUILD_LATEST}"
export BUILD_REPO="${BUILD_REPO}"
export BUILD_BRANCH="${BUILD_BRANCH}"

BUILD_DIRNAME=".build"
REPO_DIRNAME=".repo"
UPDATE_VERSIONS_SCRIPT_PATH="scripts/update-versions.cjs"

export BUILD_REPO_COMMIT_HASH=$(git rev-parse HEAD)

# ... -> void
function build_site() {
  log_info "Building documentation site..."
  yarn run docs:build
  log_info "Generating the PDF Manual"
  yarn run docs:generate-manual
}

log_title "Step 1: Build documentation site"
if [ -d "$BUILD_DIRNAME" ]; then
  if [ $(yn "⚠️  Do you want to use the existing build?") == "y" ]; then
    log_info "Using existing $BUILD_DIRNAME directory."
  else
    build_site
  fi
else
  build_site
fi

log_title "Step 2: Clone documentation repository"
if [ "$(ls -A $REPO_DIRNAME)" ]; then
  if [ $(yn "⚠️  $REPO_DIRNAME directory already exists and is not empty. Do you want to use it?") == "y" ]; then
    log_info "Using existing $REPO_DIRNAME directory."
    cd $REPO_DIRNAME
    sync_branch $BUILD_BRANCH
  else
    log_info "Removing existing $REPO_DIRNAME directory..."
    clone_branch $BUILD_REPO $BUILD_BRANCH $REPO_DIRNAME
  fi
else
  log_info "Cloning documentation repository..."
  clone_branch $BUILD_REPO $BUILD_BRANCH $REPO_DIRNAME
fi

log_title "Step 3: Update versions.json"
COMMIT_HASH=$(git rev-parse HEAD) node ../$UPDATE_VERSIONS_SCRIPT_PATH

log_title "Step 4: Copy build files"
BUILD_DIR="../$BUILD_DIRNAME"

# Copy versioned directory
upsert_dir $BUILD_DIR/$PRODUCT_VERSION/ $PRODUCT_VERSION/
log_info "Copied $PRODUCT_VERSION/ directory"

# Copy latest directory if BUILD_LATEST is true
if [ "$BUILD_LATEST" = "true" ]; then
  rm_dir_or_link ./latest
  git_rm latest
  upsert_dir $BUILD_DIR/latest/ latest/
  log_info "Copied latest/ directory"
fi

log_title "Step 5: Commit and push changes"

if [ $(yn "⚠️  Are you sure you want to commit and push changes to the $BUILD_BRANCH branch?") == "y" ]; then
  commit_repo_changes "Deploy docs v$PRODUCT_VERSION" $BUILD_BRANCH
else
  log_info "Deployment aborted by user."
  exit 0
fi

log_title "Deployment complete"
log_speak "Version: $PRODUCT_VERSION"
log_speak "Built latest: $BUILD_LATEST"
