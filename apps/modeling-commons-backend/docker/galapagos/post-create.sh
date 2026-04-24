#!/usr/bin/env bash
set -euo pipefail

GALAPAGOS_DIR="${GALAPAGOS_DIR:-/opt/galapagos}"

if [ ! -d "${GALAPAGOS_DIR}/.git" ]; then
  git clone --recurse-submodules https://github.com/NetLogo/Galapagos "${GALAPAGOS_DIR}"
fi

git -C "${GALAPAGOS_DIR}" submodule update --init --recursive

cd "${GALAPAGOS_DIR}"
npm ci
sbt -v update compile
