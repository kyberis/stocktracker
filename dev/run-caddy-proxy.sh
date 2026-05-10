#!/usr/bin/env bash
# Resolves `caddy` to an absolute path, then runs it under sudo.
# macOS sudo often drops Homebrew from PATH, so plain `sudo caddy` can fail.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/dev/Caddyfile"

resolve_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    command -v caddy
    return 0
  fi
  for p in /opt/homebrew/bin/caddy /usr/local/bin/caddy; do
    if [[ -x "$p" ]]; then
      echo "$p"
      return 0
    fi
  done
  echo "caddy not found. Install: brew install caddy" >&2
  return 1
}

CADDY_BIN="$(resolve_caddy)"
exec sudo "$CADDY_BIN" run --config "$CONFIG"
