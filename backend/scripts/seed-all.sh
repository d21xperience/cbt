#!/bin/bash
# ============================================================
# CBT Engine — Idempotent Seeds
#
# Run all seed commands. Safe to re-run.
#
# Usage:
#   ./scripts/seed-all.sh [--dev|--prod]
#     --dev   : uses ./data/platform/platform.db + DEFAULT_TENANT_SUBDOMAIN
#     --prod  : uses /var/lib/cbt/platform/platform.db + default
# ============================================================

set -e

MODE="${1:---dev}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$BACKEND_DIR"

echo "============================================================"
echo "  CBT Seeding ($MODE)"
echo "============================================================"
echo ""

# ============================================================
# 1. Determine paths based on mode
# ============================================================
case "$MODE" in
    --dev)
        PLATFORM_DB="./data/platform/platform.db"
        TENANT_BASE="./data/tenants"
        DEFAULT_SUB="dev"
        ;;
    --prod)
        PLATFORM_DB="/var/lib/cbt/platform/platform.db"
        TENANT_BASE="/var/lib/cbt/tenants"
        DEFAULT_SUB="default"
        ;;
    *)
        echo "❌ Mode must be --dev or --prod"
        exit 1
        ;;
esac

# Override dari .env kalau ada
if [ -f .env ]; then
    ENV_SUB=$(grep "^DEFAULT_TENANT_SUBDOMAIN=" .env | cut -d= -f2 | tr -d ' \r')
    ENV_PLATFORM=$(grep "^PLATFORM_DB_PATH=" .env | cut -d= -f2 | tr -d ' \r')
    ENV_TENANT_BASE=$(grep "^TENANT_BASE_PATH=" .env | cut -d= -f2 | tr -d ' \r')

    [ -n "$ENV_SUB" ] && DEFAULT_SUB="$ENV_SUB"
    [ -n "$ENV_PLATFORM" ] && PLATFORM_DB="$ENV_PLATFORM"
    [ -n "$ENV_TENANT_BASE" ] && TENANT_BASE="$ENV_TENANT_BASE"
fi

echo "  Platform DB:    $PLATFORM_DB"
echo "  Tenant base:    $TENANT_BASE"
echo "  Default tenant: $DEFAULT_SUB"
echo ""

# ============================================================
# 2. Super admin (platform DB)
# ============================================================
echo "[1/2] Seeding super admin..."

if ! command -v go >/dev/null 2>&1; then
    echo "  ❌ 'go' not found in PATH"
    exit 1
fi

if go run ./cmd/seed-superadmin \
    -username="${SEED_SUPER_USERNAME:-superadmin}" \
    -password="${SEED_SUPER_PASSWORD:-SuperAdmin123!}" \
    -name="Super Administrator" 2>&1; then
    echo "  ✅ Super admin OK"
else
    echo "  ⚠️  Super admin seed failed (non-fatal)"
fi

echo ""

# ============================================================
# 3. Tenant admin (default tenant)
# ============================================================
echo "[2/2] Seeding admin for tenant '$DEFAULT_SUB'..."

# Find tenant
TENANT_UUID=$(sqlite3 "$PLATFORM_DB" "SELECT tenant_id FROM tenants WHERE subdomain='$DEFAULT_SUB' LIMIT 1;")
DB_PATH_REL=$(sqlite3 "$PLATFORM_DB" "SELECT db_path FROM tenants WHERE subdomain='$DEFAULT_SUB' LIMIT 1;")

if [ -z "$TENANT_UUID" ] || [ -z "$DB_PATH_REL" ]; then
    echo "  ⚠️  Tenant '$DEFAULT_SUB' not found — skip seed"
else
    TENANT_DB="$TENANT_BASE/$DB_PATH_REL"
    echo "  Tenant DB: $TENANT_DB"

    if [ -f "$TENANT_DB" ]; then
        # Idempotent tenant admin seed (multi-tenant aware)
        if go run ./cmd/seed-tenant-admin \
            -subdomain="$DEFAULT_SUB" \
            -username="${SEED_ADMIN_USERNAME:-admin}" \
            -password="${SEED_ADMIN_PASSWORD:-admin123}" \
            -role=ADMIN 2>&1; then
            echo "  ✅ Admin OK"
        else
            echo "  ⚠️  Admin seed failed (non-fatal)"
        fi
    else
        echo "  ⚠️  Tenant DB file not found: $TENANT_DB"
    fi
fi

echo ""
echo "============================================================"
echo "  ✅ Seeding complete"
echo "============================================================"