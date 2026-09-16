#!/usr/bin/env bash
# Start docs-term (if needed) and open the default browser.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3737}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}"

if ! curl -sf "${URL}/health" >/dev/null 2>&1; then
  cd "$ROOT"
  if [[ ! -d node_modules ]]; then
    npm install
  fi
  nohup npm start >/tmp/docs-term.log 2>&1 &
  for _ in $(seq 1 40); do
    if curl -sf "${URL}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" || true
else
  echo "Open $URL in your browser"
fi
