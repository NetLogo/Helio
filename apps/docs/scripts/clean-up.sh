#!/bin/bash

source .env
source "$(dirname "${BASH_SOURCE[0]}")/../../../scripts/.helpers"

log_info "Removing all build artifacts..."
increase_indent

targets=(.build .repo .output .preview .build-static)
for target in "${targets[@]}"; do
  if [ -d "$target" ]; then
    rm -rf "$target"
    log_launched "Removed $target directory."
  else
    log_speak "$target directory does not exist, skipping."
  fi
done

rm .stdout.log 2>/dev/null || true
rm .stderr.log 2>/dev/null || true

log_speak "Clean-up completed."

reset_indent
