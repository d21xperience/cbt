#!/bin/bash
# ============================================
# CBT Load Test Runner
# ============================================

set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOADTEST_DIR="$BACKEND_DIR/loadtest"
RESULTS_DIR="$LOADTEST_DIR/results/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$RESULTS_DIR"
cd "$BACKEND_DIR"

echo "=========================================="
echo "  CBT Load Test — 1000 User"
echo "=========================================="
echo "Backend  : $BACKEND_DIR"
echo "Results  : $RESULTS_DIR"
echo ""

# 1. Cek prerequisites
echo "[1/5] Checking prerequisites..."
command -v k6 >/dev/null 2>&1 || { echo "❌ k6 tidak terinstall. Install: choco install k6"; exit 1; }

curl -s http://localhost:8082/health >/dev/null || { echo "❌ Backend tidak running di :8082"; exit 1; }
echo "  ✅ k6 OK"
echo "  ✅ Backend OK"

# 2. Cek data seed
echo "[2/5] Checking seed data..."
COUNT=$(sqlite3 cbt.db "SELECT COUNT(*) FROM participant_credentials WHERE nisn LIKE '99%'")
if [ "$COUNT" -lt 1000 ]; then
  echo "  ⚠️  Hanya $COUNT credentials. Seed dulu (jalankan seed-loadtest)"
  exit 1
fi
echo "  ✅ $COUNT credentials ready"

# 3. Snapshot Redis stats SEBELUM test
echo "[3/5] Snapshot Redis stats..."
docker exec cbt-redis redis-cli INFO stats > "$RESULTS_DIR/redis_before.txt" 2>/dev/null || \
  redis-cli -p 6380 INFO stats > "$RESULTS_DIR/redis_before.txt" 2>/dev/null || \
  echo "(redis-cli not available)" > "$RESULTS_DIR/redis_before.txt"

# 4. Jalankan k6
echo "[4/5] Running k6..."
echo "  Stages: 100 VU (2m) → 500 VU (3m) → 1000 VU (3m)"
echo "  Total: ~8 menit"
echo ""

k6 run \
  --out json="$RESULTS_DIR/k6-raw.json" \
  --summary-export="$RESULTS_DIR/k6-summary.json" \
  --quiet \
  "$LOADTEST_DIR/k6-exam-flow.js" \
  2>&1 | tee "$RESULTS_DIR/k6-console.log"

# 5. Snapshot Redis stats SESUDAH test
echo ""
echo "[5/5] Snapshot Redis stats AFTER..."
docker exec cbt-redis redis-cli INFO stats > "$RESULTS_DIR/redis_after.txt" 2>/dev/null || \
  redis-cli -p 6380 INFO stats > "$RESULTS_DIR/redis_after.txt" 2>/dev/null || \
  echo "(redis-cli not available)" > "$RESULTS_DIR/redis_after.txt"

# 6. Copy SQLite snapshot
cp cbt.db "$RESULTS_DIR/cbt_after.db" 2>/dev/null || true

echo ""
echo "=========================================="
echo "  ✅ Load test selesai"
echo "=========================================="
echo ""
echo "Results di: $RESULTS_DIR"
ls -la "$RESULTS_DIR"
echo ""
echo "Lihat summary:"
echo "  cat $RESULTS_DIR/k6-summary.json | python -m json.tool"