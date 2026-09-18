#!/bin/bash
# CBT Load Test Runner
RESULTS_DIR="/c/C/projects/cbt-quasar/cbt/loadtest/results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"
echo "=========================================="
echo "  CBT Load Test — Production ujian.pw"
echo "=========================================="
echo "Results: $RESULTS_DIR"
echo ""
echo "Test plan:"
echo "  Smoke  : 100 VU  (0-2 menit)"
echo "  Stress : 500 VU  (2-5 menit)"
echo "  Peak   : 1000 VU (6-9 menit)"
echo "  TOTAL  : ~10 menit"
echo ""
read -p "Press ENTER to start..."
k6 run \
  --out json="$RESULTS_DIR/k6-raw.json" \
  --summary-export="$RESULTS_DIR/k6-summary.json" \
  /c/C/projects/cbt-quasar/cbt/loadtest/k6-exam-flow.js \
  2>&1|tee "$RESULTS_DIR/k6-console.log"
echo ""
echo "✅ Test selesai"
echo "Results: $RESULTS_DIR"
ls -la "$RESULTS_DIR"
