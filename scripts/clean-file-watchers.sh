#!/bin/bash

set -e

REPO_PATH=$(dirname "$(dirname "$(realpath "$0")")")

echo "ℹ️  Process PID: $$"
echo "ℹ️  Parent PID: $PPID"

function count_os_wide_watchers() {
  echo $(lsof "/" | wc -l)
}

echo "ℹ️  Current OS-wide file watchers: $(count_os_wide_watchers)"

echo "⏳ Finding Node processes holding files in $REPO_PATH..."

PIDS=$(lsof +D "$REPO_PATH" | grep -E "node|npm" | awk '{print $2}' | sort -u)

if [ -z "$PIDS" ]; then
  echo "❌ No Node processes found holding files in the repo."
  exit 0
fi

echo "ℹ️  Found PIDs: $(echo "$PIDS" | wc -l)"

function send_sig() {
  for PID in $PIDS; do
    if echo "$PID" | grep -E "^($$|$PPID)$" >/dev/null; then
      echo "⚠️  Skipping PID $PID (self or parent)..."
      continue
    fi
    if kill -0 "$PID" 2>/dev/null; then
      echo "ℹ️  Sending $2 to PID $PID..."
      kill "$1" "$PID"
    fi
  done
}

echo "ℹ️  Attempt graceful termination..."
send_sig -15 "SIGTERM"

echo "⏳ Waiting 5 seconds for processes to terminate..."
sleep 5

echo "ℹ️  Forcefully killing remaining processes..."
send_sig -9 "SIGKILL"

echo "✔️  Done! Current OS-wide file watchers: $(count_os_wide_watchers)"
