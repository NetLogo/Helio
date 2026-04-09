#!/bin/bash
source .env
source ${BASH_SOURCE%/*}/pdf-content

DOCS_ENV_PDF=1 NUXT_PRIM_TOOLTIP_DISABLED=1 BUILD_LATEST=false ./scripts/generate.sh
