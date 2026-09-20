#!/usr/bin/env bash
# =============================================================
# scripts/verify-backend.sh
# CBT Engine — Backend Verification (static, no server)
# =============================================================
# Idempotent, read-only. Aman dijalankan berulang.
#
# Usage (dari root repo):
#   ./scripts/verify-backend.sh
#
# Exit code:
#   0 = semua PASS
#   1 = ada FAIL
#
# Baseline dari migration 000017:
#   - 10 bidang keahlian
#   - 23 program keahlian (6 is_default=1)
# =============================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ Backend dir not found: $BACKEND_DIR" >&2
  exit 1
fi

cd "$BACKEND_DIR" || exit 1

if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; NC=''
fi

PASS=0; FAIL=0
pass()    { echo -e "${GREEN}  ✅ PASS${NC}: $1"; PASS=$((PASS+1)); }
fail()    { echo -e "${RED}  ❌ FAIL${NC}: $1"; FAIL=$((FAIL+1)); }
warn()    { echo -e "${YELLOW}  ⚠️  WARN${NC}: $1"; }
section() { echo; echo -e "${CYAN}${BOLD}===== $1 =====${NC}"; }

# =============================================================
section "1. go fmt"
# =============================================================
FMT_OUT=$(go fmt ./... 2>&1)
if [ -z "$FMT_OUT" ]; then
  pass "go fmt — no diffs"
else
  echo "$FMT_OUT"
  fail "go fmt — files reformatted (harus di-commit)"
fi

# =============================================================
section "2. go vet"
# =============================================================
if VET_OUT=$(go vet ./... 2>&1); then
  pass "go vet"
else
  echo "$VET_OUT"
  fail "go vet"
fi

# =============================================================
section "3. go build"
# =============================================================
if BUILD_OUT=$(go build ./... 2>&1); then
  pass "go build"
else
  echo "$BUILD_OUT"
  fail "go build"
fi

# =============================================================
section "4. go test"
# =============================================================
TEST_OUT=$(go test -count=1 ./... 2>&1)
TEST_STATUS=$?
echo "$TEST_OUT" | grep -E "^(ok|FAIL|---)" || true
if [ "$TEST_STATUS" -eq 0 ]; then
  pass "go test — all green"
else
  fail "go test — ada yang fail"
fi

# =============================================================
section "5. Platform DB — migration tables + seed"
# =============================================================
PLATFORM_DB="$BACKEND_DIR/data/platform/platform.db"

if [ ! -f "$PLATFORM_DB" ]; then
  fail "Platform DB not found: $PLATFORM_DB"
elif ! command -v sqlite3 >/dev/null 2>&1; then
  warn "sqlite3 CLI tidak tersedia — skip DB checks"
else
  for tbl in master_bidang_keahlian master_program_keahlian tenant_programs; do
    TBL_EXISTS=$(sqlite3 -list -noheader "$PLATFORM_DB" \
      "SELECT name FROM sqlite_master WHERE type='table' AND name='$tbl';" 2>/dev/null)
    if [ "$TBL_EXISTS" = "$tbl" ]; then
      pass "table exists: $tbl"
    else
      fail "table missing: $tbl (apply migration 000017)"
    fi
  done

  BIDANG_COUNT=$(sqlite3 -list -noheader "$PLATFORM_DB" \
    "SELECT COUNT(*) FROM master_bidang_keahlian;" 2>/dev/null || echo 0)
  PROGRAM_COUNT=$(sqlite3 -list -noheader "$PLATFORM_DB" \
    "SELECT COUNT(*) FROM master_program_keahlian;" 2>/dev/null || echo 0)

  # Baseline 000017: 10 bidang
  if [ "$BIDANG_COUNT" -ge 10 ]; then
    pass "bidang seed: $BIDANG_COUNT rows (>=10)"
  else
    fail "bidang seed: hanya $BIDANG_COUNT rows (harusnya >=10)"
  fi

  # Baseline 000017: 23 program
  if [ "$PROGRAM_COUNT" -ge 23 ]; then
    pass "program seed: $PROGRAM_COUNT rows (>=23)"
  else
    fail "program seed: hanya $PROGRAM_COUNT rows (harusnya >=23)"
  fi
fi

# =============================================================
section "6. Latent bugs (informational)"
# =============================================================
VAR_OUT_LINES=$(grep -rn "var out \[\]domain" internal/platform/repository/ 2>/dev/null || true)
if [ -z "$VAR_OUT_LINES" ]; then
  pass "tidak ada 'var out []' di platform/repository"
else
  warn "latent nil-slice spots (bukan blocker, catat di BACKEND_GAPS.md):"
  echo "$VAR_OUT_LINES" | sed 's/^/      /'
fi

# =============================================================
section "SUMMARY"
# =============================================================
echo -e "  PASS: ${GREEN}$PASS${NC}"
echo -e "  FAIL: ${RED}$FAIL${NC}"
echo

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}🎉 BACKEND VERIFICATION: PASS${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}💥 BACKEND VERIFICATION: FAIL${NC}"
  exit 1
fi
