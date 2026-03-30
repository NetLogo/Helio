#!/usr/bin/env bash
# Starts the server, generates REST client types, then stops the server.
# Used by CI (release pipeline) and can be run locally.
set -euo pipefail
source .env

SERVER_URL="http://127.0.0.1:3000"
MAX_WAIT=30  # seconds

# ── Start the server in the background ──────────────────────────────────────
node --import ./src/instrumentation.ts ./src/index.ts &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

# ── Wait for the health endpoint ────────────────────────────────────────────
echo "Waiting for server to be ready…"
elapsed=0
until curl -sf "$SERVER_URL/health" > /dev/null 2>&1; do
  sleep 1
  elapsed=$((elapsed + 1))
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "Server did not become ready within ${MAX_WAIT}s" >&2
    exit 1
  fi
done
echo "Server is ready (took ${elapsed}s)"

# ── Generate REST types (OpenAPI) ───────────────────────────────────────────
echo "Generating REST client types…"
openapi-typescript "$SERVER_URL/api-docs/openapi.json" -o ./client/rest.d.ts
echo "Done — client types written to client/"

# if env CLIENT_TYPES_OUTPUT_DIR is set, also write to that location (for CI)
if [ -n "${CLIENT_TYPES_OUTPUT_DIR:-}" ]; then
  echo "Also writing REST client types to ${CLIENT_TYPES_OUTPUT_DIR}"
  openapi-typescript "$SERVER_URL/api-docs/openapi.json" -o "${CLIENT_TYPES_OUTPUT_DIR}"
  echo "Done — client types written to ${CLIENT_TYPES_OUTPUT_DIR}"
fi
