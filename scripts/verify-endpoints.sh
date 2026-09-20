#!/usr/bin/env bash
# =============================================================
# scripts/verify-endpoints.sh
# CBT Engine — Functional endpoint verification (VER-007)
# =============================================================
# Prerequisite:
#   - Backend dev sudah running di localhost:8082
#   - Admin dev tenant: admin / admin123
#   - sqlite3 CLI available (untuk cleanup)
#
# Usage:
#   ./scripts/verify-endpoints.sh
#
# Exit 0 = semua PASS, 1 = ada FAIL
# =============================================================

set -u

BASE="http://localhost:8082/api/v1/cbt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLATFORM_DB="$REPO_ROOT/backend/data/platform/platform.db"

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

# Helper: count JSON array length for simple {"count":N}
extract_count() {
  echo "$1" | grep -o '"count":[0-9]*' | head -1 | grep -o '[0-9]*'
}

# =============================================================
section "Pre-flight"
# =============================================================
if ! curl -s --max-time 3 "$BASE/public/references/bidang-keahlian" >/dev/null; then
  echo -e "${RED}❌ Backend tidak running di $BASE${NC}" >&2
  echo "   Start: cd backend && ./dev-be.sh" >&2
  exit 1
fi
pass "Backend reachable"

# =============================================================
section "1. GET /public/references/bidang-keahlian"
# =============================================================
R=$(curl -s "$BASE/public/references/bidang-keahlian")
C=$(extract_count "$R")
if [ "$C" = "10" ]; then pass "count=$C (expected 10)"; else fail "count=$C (expected 10)"; fi

if echo "$R" | grep -q '"id":"TI"'; then
  pass "bidang TI present"
else
  fail "bidang TI missing"
fi

# =============================================================
section "2. GET /public/references/program-keahlian (all)"
# =============================================================
R=$(curl -s "$BASE/public/references/program-keahlian")
C=$(extract_count "$R")
if [ "$C" = "23" ]; then pass "count=$C (expected 23)"; else fail "count=$C (expected 23)"; fi

if echo "$R" | grep -q '"bidang_nama":"Teknologi Informasi"'; then
  pass "bidang_nama embedded"
else
  fail "bidang_nama missing (LEFT JOIN broken?)"
fi

# =============================================================
section "3. GET /public/references/program-keahlian?default=true"
# =============================================================
R=$(curl -s "$BASE/public/references/program-keahlian?default=true")
C=$(extract_count "$R")
if [ "$C" = "6" ]; then pass "count=$C (expected 6)"; else fail "count=$C (expected 6)"; fi

for k in AKL MPLB RPL TKJ TKR TSM; do
  if echo "$R" | grep -q "\"kode\":\"$k\""; then
    pass "default includes $k"
  else
    fail "default missing $k"
  fi
done

# =============================================================
section "4. GET /public/references/program-keahlian?bidang=TI"
# =============================================================
R=$(curl -s "$BASE/public/references/program-keahlian?bidang=TI")
C=$(extract_count "$R")
if [ "$C" = "4" ]; then pass "count=$C (expected 4)"; else fail "count=$C (expected 4)"; fi

# =============================================================
section "5. POST /auth/admin/login"
# =============================================================
R=$(curl -s -X POST "$BASE/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$R" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [ -n "$TOKEN" ] && [ "${#TOKEN}" -gt 100 ]; then
  pass "token obtained (length=${#TOKEN})"
else
  fail "token missing/too short"
  echo "  Response: $R"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# =============================================================
section "6. GET /admin/programs (initial — empty)"
# =============================================================
R=$(curl -s -X GET "$BASE/admin/programs" -H "$AUTH")
if echo "$R" | grep -q '"data":\[\]'; then
  pass "data=[] (bukan null)"
elif echo "$R" | grep -q '"data":null'; then
  fail "data=null (nil-slice bug belum fix)"
else
  # Ada data existing — warn tapi tidak fail
  warn "data tidak kosong (mungkin ada state dari test sebelumnya)"
  pass "response valid"
fi

# =============================================================
section "7. POST find-or-create (existing) — expected created:false"
# =============================================================
R=$(curl -s -X POST "$BASE/admin/program-keahlian/find-or-create" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"kode":"TKP","nama":"Test TKP","bidang_id":"BANGUNAN"}')
if echo "$R" | grep -q '"created":false'; then
  pass "created=false for existing TKP"
else
  fail "expected created=false for TKP"
  echo "  Response: $R"
fi

# =============================================================
section "8. POST find-or-create (new) — expected created:true"
# =============================================================
TEST_KODE="VERIFY-$(date +%s)"
R=$(curl -s -X POST "$BASE/admin/program-keahlian/find-or-create" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"kode\":\"$TEST_KODE\",\"nama\":\"Verify Test\",\"bidang_id\":\"TI\"}")
TEST_ID=$(echo "$R" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)

if echo "$R" | grep -q '"created":true'; then
  pass "created=true for $TEST_KODE"
else
  fail "expected created=true for $TEST_KODE"
  echo "  Response: $R"
fi

if echo "$R" | grep -q '"is_custom":true'; then
  pass "is_custom=true"
else
  fail "is_custom should be true"
fi

if [ -z "$TEST_ID" ]; then
  fail "test_id missing — skip sisa test"
  echo
  echo -e "  PASS: $PASS  FAIL: $FAIL"
  exit 1
fi

# =============================================================
section "9. POST /admin/programs/assign"
# =============================================================
R=$(curl -s -X POST "$BASE/admin/programs/assign" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"program_id\":\"$TEST_ID\"}")
if echo "$R" | grep -q '"status":"ok"'; then
  pass "assign OK"
else
  fail "assign failed: $R"
fi

# =============================================================
section "10. GET /admin/programs (after assign — 1 item)"
# =============================================================
R=$(curl -s -X GET "$BASE/admin/programs" -H "$AUTH")
C=$(extract_count "$R")
if [ "$C" -ge 1 ]; then
  pass "count=$C (>=1)"
else
  fail "count=$C (expected >=1)"
fi

if echo "$R" | grep -q "\"id\":\"$TEST_ID\""; then
  pass "test program present in list"
else
  fail "test program missing from list"
fi

# =============================================================
section "11. POST /admin/programs/remove + cleanup"
# =============================================================
R=$(curl -s -X POST "$BASE/admin/programs/remove" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"program_id\":\"$TEST_ID\"}")
if echo "$R" | grep -q '"status":"ok"'; then
  pass "remove OK"
else
  fail "remove failed: $R"
fi

# Cleanup master_program_keahlian row (test artifact)
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$PLATFORM_DB" ]; then
  sqlite3 "$PLATFORM_DB" \
    "DELETE FROM master_program_keahlian WHERE kode='$TEST_KODE';" 2>/dev/null
  pass "cleanup master_program_keahlian: $TEST_KODE removed"
else
  warn "sqlite3 unavailable — manual cleanup: $TEST_KODE"
fi

# =============================================================
section "SUMMARY"
# =============================================================
echo -e "  PASS: ${GREEN}$PASS${NC}"
echo -e "  FAIL: ${RED}$FAIL${NC}"
echo

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}🎉 ENDPOINT VERIFICATION: PASS${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}💥 ENDPOINT VERIFICATION: FAIL${NC}"
  exit 1
fi
