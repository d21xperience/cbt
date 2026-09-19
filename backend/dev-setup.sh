#!/bin/bash
# ============================================
# CBT Engine — Dev Environment Setup (v2)
# Cross-platform: Windows Git Bash / Linux / macOS
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"
PLATFORM_DIR="$DATA_DIR/platform"
TENANT_DIR="$DATA_DIR/tenants"

echo "=========================================="
echo "  CBT Dev Environment Setup"
echo "=========================================="
echo "Data dir: $DATA_DIR"
echo ""

# ============================================
# HELPER: Cross-platform UUID generation
# ============================================
generate_uuid() {
    # Method 1: uuidgen (Linux, macOS, some Git Bash)
    if command -v uuidgen >/dev/null 2>&1; then
        uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '\r\n'
        return
    fi

    # Method 2: /proc (Linux)
    if [ -f /proc/sys/kernel/random/uuid ]; then
        cat /proc/sys/kernel/random/uuid | tr -d '\r\n'
        return
    fi

    # Method 3: PowerShell .exe (Windows Git Bash — MUST use .exe)
    if command -v powershell.exe >/dev/null 2>&1; then
        local uuid=$(powershell.exe -NoProfile -Command "[guid]::NewGuid().ToString()" 2>/dev/null | tr -d '\r\n[:space:]')
        if [ -n "$uuid" ]; then
            echo "$uuid"
            return
        fi
    fi

    # Method 4: Go compiler (universal fallback)
    if command -v go >/dev/null 2>&1; then
        local tmpfile=$(mktemp --suffix=.go 2>/dev/null || mktemp)
        cat > "$tmpfile" <<'GOEOF'
package main
import (
	"crypto/rand"
	"fmt"
)
func main() {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	fmt.Printf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
GOEOF
        local uuid=$(go run "$tmpfile" 2>/dev/null)
        rm -f "$tmpfile"
        if [ -n "$uuid" ]; then
            echo "$uuid"
            return
        fi
    fi

    # Fallback terakhir: timestamp-based (bukan UUID formal, tapi unik)
    echo "dev-$(date +%s)-$$"
}

# ============================================
# 1. Folder structure
# ============================================
mkdir -p "$PLATFORM_DIR"
mkdir -p "$TENANT_DIR"
echo "✅ Folder structure ready"

# ============================================
# 2. Init platform.db
# ============================================
PLATFORM_DB="$PLATFORM_DIR/platform.db"
if [ ! -f "$PLATFORM_DB" ]; then
    echo "Creating platform.db..."
    sqlite3 "$PLATFORM_DB" <<'SQLEOF'
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    npsn TEXT UNIQUE NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    school_name TEXT NOT NULL,
    contact_email TEXT DEFAULT '',
    contact_phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    is_suspended INTEGER NOT NULL DEFAULT 0,
    suspended_reason TEXT DEFAULT '',
    db_path TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_npsn ON tenants(npsn);

CREATE TABLE IF NOT EXISTS platform_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    full_name TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'BASIC',
    valid_from DATETIME NOT NULL,
    valid_until DATETIME NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    price_idr INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT DEFAULT '',
    target_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SQLEOF
    echo "✅ platform.db created"
else
    echo "⏭️  platform.db already exists"
fi

# ============================================
# 3. Register tenant 'dev'
# ============================================
TENANT_COUNT=$(sqlite3 "$PLATFORM_DB" "SELECT COUNT(*) FROM tenants WHERE subdomain='dev';")
if [ "$TENANT_COUNT" = "0" ]; then
    echo ""
    echo "Generating UUID..."

    TENANT_UUID=$(generate_uuid)

    # Validasi
    if [ -z "$TENANT_UUID" ]; then
        echo "❌ CRITICAL: Gagal generate UUID"
        echo "   Coba install: apt install uuid-runtime (Linux) atau pastikan powershell.exe / go tersedia"
        exit 1
    fi

    echo "✅ UUID: $TENANT_UUID"
    echo ""

    TENANT_DIR_DEV="$TENANT_DIR/$TENANT_UUID"
    mkdir -p "$TENANT_DIR_DEV"

    REL_DB_PATH="tenants/$TENANT_UUID/cbt.db"

    sqlite3 "$PLATFORM_DB" "INSERT INTO tenants (tenant_id, npsn, subdomain, school_name, db_path) VALUES ('$TENANT_UUID', '99999999', 'dev', 'Dev Tenant', '$REL_DB_PATH');"

    echo "✅ Tenant 'dev' registered"
    echo "   UUID:    $TENANT_UUID"
    echo "   DB:      $TENANT_DIR_DEV/cbt.db"
    echo "   RelPath: $REL_DB_PATH"

    # Save UUID untuk dipakai script lain
    echo "$TENANT_UUID" > "$TENANT_DIR/.dev-tenant-uuid"
else
    TENANT_UUID=$(sqlite3 "$PLATFORM_DB" "SELECT tenant_id FROM tenants WHERE subdomain='dev'")
    echo "⏭️  Tenant 'dev' already exists (UUID: $TENANT_UUID)"
fi

# ============================================
# 4. Apply migrations
# ============================================
TENANT_DB="$TENANT_DIR/$TENANT_UUID/cbt.db"
echo ""
echo "Applying migrations to: $TENANT_DB"
echo ""

# Skip list — migrations yang TIDAK untuk fresh tenant DB
SKIP_MIGRATIONS=(
    "000013_backfill_tenant_id.up.sql"
    "000014_add_tenant_status.up.sql"
    "000015_add_pending_admin_username.up.sql"
)

is_skip() {
    local name="$1"
    for s in "${SKIP_MIGRATIONS[@]}"; do
        [ "$name" = "$s" ] && return 0
    done
    return 1
}

for f in "$SCRIPT_DIR"/migrations/*.up.sql; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    if is_skip "$name"; then
        echo "  ⏭️  $name (skip — not for fresh tenant)"
        continue
    fi
    echo "  → $name"
    sqlite3 "$TENANT_DB" < "$f" 2>&1 | grep -v "duplicate column\|already exists" || true
done

# ============================================
# 5. Verify
# ============================================
echo ""
echo "=== Tables in dev tenant DB ==="
sqlite3 "$TENANT_DB" ".tables" | tr ' ' '\n' | sort | grep -v '^$'

echo ""
echo "=== Tenant registry ==="
sqlite3 "$PLATFORM_DB" "SELECT tenant_id, subdomain, db_path FROM tenants;"

echo ""
echo "=========================================="
echo "  ✅ Dev setup complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create .env (kalau belum):"
echo "   cat .env.example  # lihat template"
echo ""
echo "2. Pastikan .env lokal berisi:"
echo "   DEFAULT_TENANT_SUBDOMAIN=dev"
echo "   PLATFORM_DB_PATH=./data/platform/platform.db"
echo "   TENANT_BASE_PATH=./data"
echo ""
echo "3. Seed dev admin:"
echo "   go run ./cmd/seed-dev"
echo ""
echo "4. Run server:"
echo "   go run ./cmd/server"
echo ""
