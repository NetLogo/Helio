#!/bin/sh
set -e

yarn turbo run build
yarn turbo run lint
yarn turbo run check-types
yarn turbo run test
