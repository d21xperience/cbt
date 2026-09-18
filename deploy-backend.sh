#!/bin/bash
# ============================================
# CBT Backend Deploy Script (Windows-compatible)
# Usage: ./deploy-backend.sh [--no-build] [--logs]
# ============================================
set -e

VPS="${VPS:-root@116.212.72.33}"
BACKEND_DIR="/opt/cbt/backend"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE="cbt-backend"
GO_BIN="/usr/local/go/bin/go"

# Colors
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${G}[$(date +%H:%M:%S)]${N} $1"; }
warn() { echo -e "${Y}[$(date +%H:%M:%S)]${N} $1"; }
err()  { echo -e "${R}[$(date +%H:%M:%S)]${N} $1"; }

# Parse args
SKIP_BUILD=false
SHOW_LOGS=false
for arg in "$@"; do
  case $arg in
    --no-build) SKIP_BUILD=true ;;
    --logs)     SHOW_LOGS=true ;;
    *) err "Unknown arg: $arg"; exit 1 ;;
  esac
done

# ============================================
# Pre-checks
# ============================================
log "Pre-checks..."
[ -d "$LOCAL_DIR/backend" ] || { err "Not in cbt/ root"; exit 1; }

ssh -q -o ConnectTimeout=5 "$VPS" "echo ok" >/dev/null || {
  err "Cannot SSH to $VPS"; exit 1;
}
log "  ✅ SSH to VPS OK"

# Local build verify
log "Verify local build..."
cd "$LOCAL_DIR/backend"
if ! go build ./... 2>&1 | head -20; then
  err "Local build failed"; exit 1
fi
log "  ✅ Local build OK"

# ============================================
# Pack & Sync (via tar+scp, karena rsync tidak ada di Windows)
# ============================================
log "Packing source..."
cd "$LOCAL_DIR"
TARBALL="/tmp/cbt-backend-$(date +%s).tar.gz"

tar -czf "$TARBALL" \
  --exclude='backend/cbt.db' \
  --exclude='backend/cbt.db-shm' \
  --exclude='backend/cbt.db-wal' \
  --exclude='backend/.env' \
  --exclude='backend/*.exe' \
  --exclude='backend/cbt-server' \
  --exclude='backend/node_modules' \
  --exclude='backend/.git' \
  --exclude='backend/loadtest/results' \
  backend/

SIZE=$(ls -lh "$TARBALL" | awk '{print $5}')
log "  ✅ Packed: $SIZE"

log "Uploading to VPS..."
scp -q "$TARBALL" "$VPS:/tmp/"
log "  ✅ Upload OK"

rm -f "$TARBALL"

# ============================================
# Extract on VPS
# ============================================
log "Extracting on VPS..."
ssh "$VPS" "cd $BACKEND_DIR && \
  tar -xzf /tmp/$(basename $TARBALL) --strip-components=1 && \
  rm -f /tmp/$(basename $TARBALL)"
log "  ✅ Extract OK"

# ============================================
# Remote build
# ============================================
if [ "$SKIP_BUILD" = false ]; then
  log "Building on VPS..."
  ssh "$VPS" "cd $BACKEND_DIR && $GO_BIN build -o cbt-server ./cmd/server" || {
    err "Remote build failed"; exit 1
  }
  log "  ✅ Remote build OK"
fi

# ============================================
# Restart service
# ============================================
log "Restarting $SERVICE..."
ssh "$VPS" "systemctl restart $SERVICE"
sleep 3

# ============================================
# Health check
# ============================================
log "Health check..."
HEALTH=$(ssh "$VPS" "curl -s http://127.0.0.1:8082/health")
if [[ "$HEALTH" == *'"status":"OK"'* ]]; then
  log "  ✅ Backend healthy"
else
  err "  ❌ Health check failed: $HEALTH"
  err "  Recent logs:"
  ssh "$VPS" "journalctl -u $SERVICE -n 30 --no-pager"
  exit 1
fi

# Optional: show logs
if [ "$SHOW_LOGS" = true ]; then
  log "Recent logs:"
  ssh "$VPS" "journalctl -u $SERVICE -n 30 --no-pager"
fi

log "✅ Deploy complete"
log ""
log "Test: curl -s https://ujian.pw/api/v1/cbt/super/schools"
