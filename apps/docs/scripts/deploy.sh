#!/bin/bash
# Deploy script for documentation
# This script follows the steps outlined in ./deploy.md

set -ea
source .env
source scripts/.helpers

# Validate required environment variables
if [ -z "$PROJECT_ROOT" ]; then
  echo "Error: PROJECT_ROOT is not set in .env"
  exit 1
fi

if [ -z "$BUILD_REPO" ]; then
  echo "Error: BUILD_REPO is not set in .env"
  exit 1
fi

if [ -z "$PRODUCT_VERSION" ]; then
  echo "Error: PRODUCT_VERSION is not set in .env"
  exit 1
fi

if [ -z "$PRODUCT_DISPLAY_NAME" ]; then
  echo "Error: PRODUCT_DISPLAY_NAME is not set in .env"
  exit 1
fi

if [ -z "$BUILD_LATEST" ]; then
  echo "Error: BUILD_LATEST is not set in .env"
  exit 1
fi

if [ -z "$BUILD_BRANCH" ]; then
  echo "Error: BUILD_BRANCH is not set in .env"
  exit 1
fi

echo "=== Step 1: Build documentation site ==="
if [ -d .build ]; then
  read -p "⚠️  Do you want to use the existing build? (y/n): " use_existing
  if [ "$use_existing" != "y" ]; then
    echo "💡 (Re)building documentation site..."
    yarn run docs:build
  else
    echo "💡 Using existing .build directory."
  fi
else
  echo "💡 Building documentation site..."
  yarn run docs:build
  yarn run docs:generate-manual
fi

echo ""
echo "=== Step 2: Clone documentation repository ==="
if [ "$(ls -A .repo)" ]; then
  read -p "⚠️  .repo directory already exists and is not empty. Do you want to use it? (y/n): " use_repo
  if [ "$use_repo" != "y" ]; then
    echo "💡 Removing existing .repo directory..."
    rm -rf .repo
    git clone $BUILD_REPO --branch $BUILD_BRANCH .repo
    cd .repo
  else
    echo "💡 Using existing .repo directory."
    cd .repo
    git fetch origin $BUILD_BRANCH
    git reset --hard origin/$BUILD_BRANCH
  fi
else
  echo "💡 Cloning documentation repository..."
  rm -rf .repo || true
  git clone $BUILD_REPO --branch $BUILD_BRANCH .repo
  cd .repo
fi

echo ""
echo "=== Step 3: Update versions.json ==="
COMMIT_HASH=$(git rev-parse HEAD) BUILD_REPO_COMMIT_HASH=$(cd ..; git rev-parse HEAD) node ../scripts/update-versions.cjs

echo ""
echo "=== Step 4: Copy build files ==="
BUILD_DIR="../.build"

# Copy versioned directory
rm -rf $PRODUCT_VERSION/
cp -R $BUILD_DIR/$PRODUCT_VERSION/ $PRODUCT_VERSION/
echo "💡 Copied $PRODUCT_VERSION/ directory"

# Copy latest directory if BUILD_LATEST is true
if [ "$BUILD_LATEST" = "true" ]; then
  rmDirOrLink ./latest
  if git ls-files --error-unmatch latest >/dev/null 2>&1; then
    git rm -rf latest
  fi
  if [ -d "$BUILD_DIR/latest" ]; then
    cp -R "$BUILD_DIR/latest" latest/
    echo "💡 Copied latest/ from $BUILD_DIR/latest"
  else
    echo "❌ Error: resolved latest target is not a directory"
    exit 1
  fi
fi

echo ""
echo "=== Step 5: Commit and push changes ==="

read -p "⚠️  Are you sure you want to commit and push changes to the $BUILD_BRANCH branch? (y/n): " confirm_push
if [ "$confirm_push" != "y" ]; then
  echo "💡 Deployment aborted by user."
  exit 0
fi

git add .

if git diff --staged --quiet; then
  echo "💡 No changes to commit"
else
  git commit -m "[NETLOGO-BOT] Deploy documentation for version $PRODUCT_VERSION"
  git push origin $BUILD_BRANCH
  echo "🚀 Successfully pushed changes to $BUILD_BRANCH branch"
fi

echo ""
echo "=== Deployment complete ==="
echo "💬 Version: $PRODUCT_VERSION"
echo "💬 Built latest: $BUILD_LATEST"
