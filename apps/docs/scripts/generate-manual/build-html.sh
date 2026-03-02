#!/bin/bash
source .env
source ${BASH_SOURCE%/*}/content

DOCS_ENV_PDF=1 BUILD_LATEST=false ./scripts/generate.sh
