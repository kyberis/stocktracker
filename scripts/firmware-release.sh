#!/usr/bin/env bash
set -euo pipefail

# Firmware release helper — builds, computes checksums, and prints
# the env vars you need to set on Vercel to deploy the update.
#
# Usage:
#   ./scripts/firmware-release.sh                    # build + show info
#   ./scripts/firmware-release.sh --tag              # build + create git tag
#   ./scripts/firmware-release.sh --gh-release       # build + tag + GitHub Release

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FW_DIR="$PROJECT_ROOT/lilygo-t4s3"
BIN_PATH="$FW_DIR/.pio/build/lilygo-t4-s3/firmware.bin"
CONFIG_H="$FW_DIR/src/config.h"

MODE="${1:-info}"

# Extract version from config.h
VERSION=$(grep 'FW_VERSION' "$CONFIG_H" | sed 's/.*"\(.*\)".*/\1/')
if [ -z "$VERSION" ]; then
  echo -e "${RED}ERROR: Could not extract FW_VERSION from $CONFIG_H${NC}"
  exit 1
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Firmware Release — v${VERSION}                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Build
echo -e "${YELLOW}[1/3] Building firmware...${NC}"
cd "$FW_DIR"
pio run -e lilygo-t4-s3
echo -e "${GREEN}✓ Build complete${NC}"

# Compute checksums
if [ ! -f "$BIN_PATH" ]; then
  echo -e "${RED}ERROR: Binary not found at $BIN_PATH${NC}"
  exit 1
fi

SHA256=$(shasum -a 256 "$BIN_PATH" | cut -d' ' -f1)
SIZE=$(stat -f%z "$BIN_PATH" 2>/dev/null || stat -c%s "$BIN_PATH")

echo ""
echo -e "${YELLOW}[2/3] Firmware artifact info${NC}"
echo -e "  Version:  ${GREEN}${VERSION}${NC}"
echo -e "  SHA-256:  ${GREEN}${SHA256}${NC}"
echo -e "  Size:     ${GREEN}${SIZE} bytes${NC}"
echo -e "  Binary:   ${BIN_PATH}"

# Copy to a named file for upload
RELEASE_BIN="$FW_DIR/firmware-t4s3-${VERSION}.bin"
cp "$BIN_PATH" "$RELEASE_BIN"
echo -e "  Release:  ${RELEASE_BIN}"

echo ""
echo -e "${YELLOW}[3/3] Environment variables for Vercel${NC}"
echo ""
echo -e "${CYAN}FIRMWARE_LATEST_VERSION=${VERSION}${NC}"
echo -e "${CYAN}FIRMWARE_LATEST_SHA256=${SHA256}${NC}"
echo -e "${CYAN}FIRMWARE_LATEST_SIZE=${SIZE}${NC}"
echo -e "${CYAN}FIRMWARE_LATEST_URL=<set after uploading to GitHub Releases>${NC}"
echo -e "${CYAN}FIRMWARE_LATEST_NOTES=<your release notes>${NC}"
echo ""

if [ "$MODE" = "--tag" ] || [ "$MODE" = "--gh-release" ]; then
  echo -e "${YELLOW}Creating git tag fw-v${VERSION}...${NC}"
  cd "$PROJECT_ROOT"
  git tag "fw-v${VERSION}" 2>/dev/null && echo -e "${GREEN}✓ Tag created${NC}" || echo -e "${YELLOW}Tag fw-v${VERSION} already exists${NC}"

  if [ "$MODE" = "--gh-release" ]; then
    echo -e "${YELLOW}Pushing tag and creating GitHub Release...${NC}"
    git push origin "fw-v${VERSION}"

    REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || echo "")
    if [ -z "$REPO" ]; then
      echo -e "${RED}Could not determine GitHub repo. Run 'gh auth login' first.${NC}"
      exit 1
    fi

    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/fw-v${VERSION}/firmware-t4s3-${VERSION}.bin"

    gh release create "fw-v${VERSION}" \
      "$RELEASE_BIN" \
      --title "Firmware v${VERSION}" \
      --notes "SHA-256: \`${SHA256}\`  |  Size: ${SIZE} bytes

Set on Vercel:
\`\`\`
FIRMWARE_LATEST_VERSION=${VERSION}
FIRMWARE_LATEST_URL=${DOWNLOAD_URL}
FIRMWARE_LATEST_SHA256=${SHA256}
FIRMWARE_LATEST_SIZE=${SIZE}
\`\`\`"

    echo ""
    echo -e "${GREEN}✓ GitHub Release created${NC}"
    echo -e "  URL: https://github.com/${REPO}/releases/tag/fw-v${VERSION}"
    echo ""
    echo -e "${CYAN}FIRMWARE_LATEST_URL=${DOWNLOAD_URL}${NC}"
  fi
fi

echo ""
echo -e "${GREEN}Done.${NC}"
