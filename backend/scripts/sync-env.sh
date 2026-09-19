#!/bin/bash
# ============================================================
# MASTER — Full Environment Sync
#
# 1. Migrate platform DB
# 2. Migrate all tenant DBs
# 3. Seed (super admin + default tenant admin)
# 4. Verify schema
#
# Usage:
#   ./scripts/sync-env.sh [--dev|--prod] [--verify-only]
# ============================================================

set -e

MODE="${1:---dev}"
VERIFY_ONLY="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$BACKEND_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  CBT Engine — Environment Sync                           ║"
echo "║  Mode: $MODE                                             "
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# Determine paths
# ============================================================
case "$MODE" in
    --dev)
        PLATFORM_DB="./data/platform/platform.db"
        TENANT_BASE="./data/tenants"
        ;;
    --prod)
        PLATFORM_DB="/var/lib/cbt/platform/platform.db"
        TENANT_BASE="/var/lib/cbt/tenants"
        ;;
    *)
        echo "❌ Mode must be --dev or --prod"
        exit 1
        ;;
esac

# Override dari .env kalau ada
if [ -f .env ]; then
    ENV_PLATFORM=$(grep "^PLATFORM_DB_PATH=" .env | cut -d= -f2 | tr -d ' \r')
    ENV_TENANT_BASE=$(grep "^TENANT_BASE_PATH=" .env | cut -d= -f2 | tr -d ' \r')

    [ -n "$ENV_PLATFORM" ] && PLATFORM_DB="$ENV_PLATFORM"
    [ -n "$ENV_TENANT_BASE" ] && TENANT_BASE="$ENV_TENANT_BASE"
fi

# ============================================================
# 1. Migrate platform DB
# ============================================================
if [ "$VERIFY_ONLY" != "--verify-only" ]; then
    echo "[1/4] Migrating platform DB..."
    echo "      Path: $PLATFORM_DB"

    if [ ! -f "$PLATFORM_DB" ]; then
        echo "      ❌ Platform DB not found. Run ./dev-setup.sh first (dev) or setup production."
        exit 1
    fi

    ./scripts/migrate.sh "$PLATFORM_DB" platform
    echo ""
else
    echo "[1/4] SKIP (verify-only mode)"
fi

# ============================================================
# 2. Migrate all tenant DBs
# ============================================================
if [ "$VERIFY_ONLY" != "--verify-only" ]; then
    echo "[2/4] Migrating tenant DBs..."

    if [ ! -d "$TENANT_BASE/tenants" ]; then
        echo "      ⚠️  Tenant base not found: $TENANT_BASE"
    else
        TENANT_COUNT=0
        for tenant_dir in "$TENANT_BASE/tenants"/*/; do
            [ -d "$tenant_dir" ] || continue
            tenant_id=$(basename "$tenant_dir")
            tenant_db="$tenant_dir/cbt.db"

            if [ ! -f "$tenant_db" ]; then
                continue
            fi

            echo "      → Tenant: $tenant_id"
            ./scripts/migrate.sh "$tenant_db" tenant
            TENANT_COUNT=$((TENANT_COUNT+1))
        done

        echo "      Total tenants migrated: $TENANT_COUNT"
    fi
    echo ""
else
    echo "[2/4] SKIP (verify-only mode)"
fi

# ============================================================
# 3. Seed
# ============================================================
if [ "$VERIFY_ONLY" != "--verify-only" ]; then
    echo "[3/4] Seeding..."
    ./scripts/seed-all.sh "$MODE"
    echo ""
else
    echo "[3/4] SKIP (verify-only mode)"
fi

# ============================================================
# 4. Verify schema parity
# ============================================================
echo "[4/4] Verify schema..."
echo ""

if [ "$MODE" = "--dev" ]; then
    echo "  ℹ️  Dev mode: skipping cross-DB verify."
    echo "      To verify vs production, run:"
    echo "      ./scripts/verify-schema.sh ./data/platform/platform.db /path/to/prod.db"
else
    echo "  ℹ️  Verify requires both DBs accessible from same host."
    echo "      Run from VPS if comparing."
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Sync complete                                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""