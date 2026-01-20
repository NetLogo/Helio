#!/bin/bash

PORT=${PORT:-3002}

source .env
source ${BASH_SOURCE%/*}/../../../scripts/.helpers


if [ ! -d .build ]; then
  log "Error: Build directory './build' does not exist. Please run the build script first."
  exit 1
fi

log_warn "This script will kill any process using port $PORT."
kill_processes_by_port $PORT

log_info "Starting preview server for built documentation..."

rm -rf .preview || true
mkdir .preview
cp -r .build/* .preview/
cd .preview
if [ -d latest ]; then
  unroll latest
fi
npx serve .preview -l $PORT
