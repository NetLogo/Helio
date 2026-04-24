#!/usr/bin/env bash
set -euo pipefail

GALAPAGOS_DIR="${GALAPAGOS_DIR:-/opt/galapagos}"

if [ ! -d "${GALAPAGOS_DIR}/.git" ]; then
  git clone --recurse-submodules https://github.com/NetLogo/Galapagos "${GALAPAGOS_DIR}"
  exit 0
fi

current_branch="$(git -C "${GALAPAGOS_DIR}" rev-parse --abbrev-ref HEAD || echo main)"
if [ "${current_branch}" = "HEAD" ]; then
  current_branch="main"
fi

git -C "${GALAPAGOS_DIR}" fetch origin --tags
if git -C "${GALAPAGOS_DIR}" show-ref --verify --quiet "refs/remotes/origin/${current_branch}"; then
  git -C "${GALAPAGOS_DIR}" pull --ff-only origin "${current_branch}"
else
  git -C "${GALAPAGOS_DIR}" pull --ff-only origin main
fi

git -C "${GALAPAGOS_DIR}" submodule update --init --recursive
