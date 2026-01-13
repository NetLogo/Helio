#!/bin/sh
set -e

HELIO_SKIP_CHECKS=${HELIO_SKIP_CHECKS:-0}

if [ "$HELIO_SKIP_CHECKS" = "1" ]; then
  echo "Skipping repository checks (HELIO_SKIP_CHECKS=1)"
  exit 0
fi

yarn turbo run build
yarn turbo run lint
yarn turbo run check-types
yarn turbo run test
