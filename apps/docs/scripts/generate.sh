#!/bin/bash
# Description: Script to generate static files for multiple base paths

source .env
source ${BASH_SOURCE%/*}/../../../scripts/.helpers

BUILD_LATEST="${BUILD_LATEST:-false}"
TARGET_DIR="$(pwd)/.build"

function build_latest() {
  [[ "$BUILD_LATEST" == "true" ]]
}

log_processing "Starting generation of static files..."

function prepare() {
  if is_headless; then
    log_info "Headless mode: streaming to console."
  else
    STDOUT_LOG=".stdout.log"
    STDERR_LOG=".stderr.log"
    : > "$STDOUT_LOG"
    : > "$STDERR_LOG"
    log_info "Command output -> $STDOUT_LOG / $STDERR_LOG"
  fi

  # Kill interfering processes in interactive mode
  if is_interactive; then
    processes_to_kill=(node yarn npm)
    log_warn "This script will kill all ${processes_to_kill[*]} processes."
    kill_processes_by_name "${processes_to_kill[@]}"
    log_success "Killed specified processes."

    if build_latest; then
      log_info "Building latest version in addition to ${PRODUCT_VERSION}"
    else
      log_info "Building only version ${PRODUCT_VERSION}"
    fi
  fi

  # Clean target directory
  log_info "Cleaning target directory: $TARGET_DIR"
  rm -rf "$TARGET_DIR"
  mkdir -p "$TARGET_DIR"
  log "🧹 Emptied target directory: $TARGET_DIR"

  # Prepare Nuxt
  log_info "Preparing Nuxt"
  noisy npx nuxi cleanup
  BASE_PATH="/" noisy yarn run nuxt:prepare
  log_success "Finished preparing Nuxt"
}

function build() {
  local base_path="$1"
  local target_subdir="$2"

  log_info "Building with base path: $base_path"
  BASE_PATH="$base_path" noisy yarn run nuxt:generate
  upsert_dir .output/public "$TARGET_DIR/$target_subdir"
  log_success "Finished building for base path: $base_path"
}

prepare
if build_latest; then
  build "/" "latest"
fi

build "/$PRODUCT_VERSION/" "$PRODUCT_VERSION"

# 5) Clean up gitignore files
log "🧹 Cleaning up .gitignore files..."
find "$TARGET_DIR" -name ".gitignore" -delete || true

log_success "Generation completed. Output is in $TARGET_DIR"
