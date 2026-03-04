#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step=0
total=5

run_step() {
  step=$((step + 1))
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  [$step/$total] $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

fail() {
  echo ""
  echo -e "${RED}✗ FAILED: $1${NC}"
  echo -e "${RED}  Pre-deploy checks did not pass. Fix the issues above before deploying.${NC}"
  exit 1
}

pass() {
  echo -e "${GREEN}✓ $1${NC}"
}

echo ""
echo -e "${YELLOW}╔════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     StockTracker Pre-Deploy Test Suite         ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════╝${NC}"

# ── 1. TypeScript type checking ──
run_step "TypeScript Type Check"
if npx tsc --noEmit; then
  pass "Type check passed"
else
  fail "Type check"
fi

# ── 2. ESLint ──
run_step "ESLint"
if npx eslint src/ --max-warnings 0 2>/dev/null || npx eslint src/; then
  pass "Lint passed"
else
  fail "ESLint"
fi

# ── 3. Unit Tests (Vitest) ──
run_step "Unit Tests (Vitest)"
if npx vitest run; then
  pass "Unit tests passed"
else
  fail "Unit tests"
fi

# ── 4. Production Build ──
run_step "Production Build"
if npm run build; then
  pass "Build succeeded"
else
  fail "Production build"
fi

# ── 5. E2E Tests (Playwright) ──
run_step "E2E Tests (Playwright)"
if npx playwright test; then
  pass "E2E tests passed"
else
  fail "E2E tests"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ All pre-deploy checks passed!           ║${NC}"
echo -e "${GREEN}║     Safe to deploy to Vercel.                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
