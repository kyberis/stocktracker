#!/usr/bin/env bash
# Insert IPv6 loopback lines into /etc/hosts for *.trefolio-dev.com (dual-stack fix).
# Run once: bash dev/apply-ipv6-hosts.sh
# Requires sudo (password prompt).
set -euo pipefail
cd "$(dirname "$0")/.."
if grep -q '::1[[:space:]]\+trefolio-dev\.com' /etc/hosts 2>/dev/null; then
  echo "IPv6 entries already present in /etc/hosts — nothing to do."
  exit 0
fi
MARK='# <<< trefolio-dev <<<'
if ! grep -q "$MARK" /etc/hosts; then
  echo "Expected marker '$MARK' not found. Append dev/hosts.txt first (see dev/README.md)." >&2
  exit 1
fi
sudo python3 <<'PY'
from pathlib import Path
path = Path("/etc/hosts")
text = path.read_text()
marker = "# <<< trefolio-dev <<<"
insert = """# IPv6 loopback — avoids slow dual-stack fallback when the browser prefers ::1.
::1	trefolio-dev.com
::1	clara.trefolio-dev.com
::1	will.trefolio-dev.com
::1	user.trefolio-dev.com
"""
if "::1\ttrefolio-dev.com" in text:
    print("IPv6 lines already present.")
else:
    if marker not in text:
        raise SystemExit("trefolio-dev closing marker missing from /etc/hosts")
    path.write_text(text.replace(marker, insert + marker, 1))
    print("Inserted IPv6 loopback lines into /etc/hosts.")
PY
