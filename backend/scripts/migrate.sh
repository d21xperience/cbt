#!/bin/bash
# ============================================================
# CBT Engine — Migration Runner
#
# Apply pending migrations to a target DB.
# Idempotent: uses schema_migrations tracking table.
#
# Usage:
#   ./scripts/migrate.sh <db_path> <target>
#     target: platform | tenant
#
# Examples:
#   ./scripts/migrate.sh ./data/platform/platform.db platform
#   ./scripts/migrate.sh ./data/tenants/xxx/cbt.db tenant
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$SCRIPT_DIR/migrations-manifest.txt"
MIGRATIONS_DIR="$BACKEND_DIR/migrations"

if [ $# -ne 2 ]; then
    echo "Usage: $0 <db_path> <target>"
    echo "  target: platform | tenant"
    exit 1
fi

DB_PATH="$1"
TARGET="$2"

if [ "$TARGET" != "platform" ] && [ "$TARGET" != "tenant" ]; then
    echo "❌ target must be 'platform' or 'tenant'"
    exit 1
fi

if [ ! -f "$MANIFEST" ]; then
    echo "❌ manifest not found: $MANIFEST"
    exit 1
fi

# ============================================================
# 1. Ensure tracking table exists
# ============================================================
sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null

# ============================================================
# 2. Read manifest, apply pending migrations
# ============================================================
APPLIED=0
SKIPPED=0
FAILED=0

while IFS=' ' read -r filename target _rest; do
     # Strip CR (Windows CRLF)
    filename="${filename%$'\r'}"
    target="${target%$'\r'}"
    
    # Skip comment/empty
    [[ -z "$filename" ]] && continue
    [[ "$filename" =~ ^# ]] && continue

    # Match target?
    if [ "$target" != "$TARGET" ] && [ "$target" != "both" ]; then
        continue
    fi

    # Migration file exists?
    MIGRATION_FILE="$MIGRATIONS_DIR/$filename"
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo "  ⚠️  SKIP (file missing): $filename"
        continue
    fi

    # Already applied?
    EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM schema_migrations WHERE version='$filename';")
    if [ "$EXISTS" = "1" ]; then
        SKIPPED=$((SKIPPED+1))
        continue
    fi

    # Apply
    if sqlite3 "$DB_PATH" < "$MIGRATION_FILE" 2>&1 | grep -v "duplicate column\|already exists" || true; then
        # Record as applied
        sqlite3 "$DB_PATH" "INSERT INTO schema_migrations (version) VALUES ('$filename');"
        echo "  ✓ $filename"
        APPLIED=$((APPLIED+1))
    else
        echo "  ❌ FAILED: $filename"
        FAILED=$((FAILED+1))
    fi
done < "$MANIFEST"

# ============================================================
# 3. Summary
# ============================================================
echo ""
echo "  Applied: $APPLIED | Skipped: $SKIPPED | Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi