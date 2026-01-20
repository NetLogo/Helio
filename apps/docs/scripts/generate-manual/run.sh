#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/../../../../scripts/.helpers"
source scripts/generate-manual/.help

PORT=${PORT:-3002}
MANUAL_NAME="NetLogo_User_Manual.pdf"

log "⚠️  This script will kill any process using port $PORT."
lsof -ti:$PORT | xargs -r kill -9 >/dev/null 2>/dev/null || true

set -ea
source .env

if [ ! -d ".build/latest" ] && [ ! -d ".build/${PRODUCT_VERSION}" ]; then
  log "❌ .build/latest or .build/${PRODUCT_VERSION} does not exist. Please run 'yarn run docs:build' first."
  exit 1
fi

(yarn run docs:preview --port $PORT > /dev/null 2>&1) &
PREVIEW_PID=$!
log "🚀 Started preview server (PID $PREVIEW_PID)"

until curl -fsS "http://localhost:$PORT" >/dev/null 2>/dev/null; do
  log "⏳ Waiting for http://localhost:$PORT..."
  sleep 2
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

extensions=$(find $REPO_ROOT/external/extensions -name documentation.yaml | awk -F'/' '{print $(NF-1)}' | paste -sd' ' -)
extensionCount=$(echo $extensions | wc -w | tr -d ' ')
log "💡 Found $extensionCount extensions."
log ""

if [ -d ".build/latest" ]; then
  fileDirectory="$(pwd)/.preview"
  urlPrefix="null"
  imagesDirUri="/images"
else
  fileDirectory="$(pwd)/.preview/${PRODUCT_VERSION}"
  urlPrefix="${PRODUCT_VERSION}/"
  imagesDirUri="/${PRODUCT_VERSION}/images"
fi

title=$(cat <<EOF
<html lang="en"><head>
		<title>NetLogo ${PRODUCT_VERSION} User Manual</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
		<style>
			body.title {
				width: 100vw;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
        font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
			}
      body.title h1.landing {
        background: transparent;
        color: #1a1a1a;
      }
      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        max-width: 90vw;
        line-height: 1.5;
      }
      pre code span {
        line-height: 1.5;
      }
		</style>
	</head>
	<body class="title">
		<img src="${imagesDirUri}/manual-banner.png" width="600" height="231" alt="Title image">
		<h1 class="landing">The NetLogo ${PRODUCT_VERSION} User Manual</h1>
</body></html>
EOF
)

log "💡 Generating title page."
echo "$title" > "$fileDirectory/title.html"

files=(
  "title"
  "whatis"
  "copyright"
  "versions"
  "requirements"
  "contact"
  "sample"
  "tutorial1"
  "tutorial2"
  "tutorial3"
  "interface"
  "interfacetab"
  "infotab"
  "codetab"
  "programming"
  "netlogo7intro"
  "netlogopreferences"
  "transition"
  "extension-manager"
  "shapes"
  "behaviorspace"
  "systemdynamics"
  "colorpicker"
  "hubnet"
  "hubnet-authoring"
  "modelingcommons"
  "logging"
  "controlling"
  "mathematica"
  "3d"
  "hpc"
  "extensions"
  "extension-authoring"
  "colorpicker"
  "netlogo7intro"
  "netlogopreferences"
)
for ext in $extensions; do
  files+=("$ext")
done
files+=("faq" "dictionary")

log "💡 Generating manual for files: ${files[*]}"
log ""


for f in "${files[@]}"; do
  if [ ! -f "$fileDirectory/${f}.html" ]; then
    log "❌ File not found: $fileDirectory/${f}.html"
    exit 1
  fi
  log "✅ Found file: $fileDirectory/${f}.html"
done
log ""

node scripts/generate-manual/index.cjs \
  "localhost" "$PORT" \
  $urlPrefix \
  $(for f in "${files[@]}"; do echo "$fileDirectory/${f}.html"; done) \
  ".build/$MANUAL_NAME"

log "✅ Generated .build/$MANUAL_NAME"

cp ".build/$MANUAL_NAME" .build/${PRODUCT_VERSION}/$MANUAL_NAME
log "✅ Copied to .build/${PRODUCT_VERSION}/$MANUAL_NAME"

if [ -d ".build/latest" ]; then
  cp ".build/$MANUAL_NAME" .build/latest/$MANUAL_NAME
fi
log "✅ Copied to .build/latest/$MANUAL_NAME"

if [[ -n "$PREVIEW_PID" ]]; then
  kill "$PREVIEW_PID"
  log "✅ Killed preview server (PID $PREVIEW_PID)"
fi

exit 0
