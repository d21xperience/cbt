#!/bin/bash
# ============================================================
# Verify schema parity between two DBs (dev vs prod).
# Compares STRUCTURE (tables, columns, types) — bukan byte-level.
#
# Usage:
#   ./scripts/verify-schema.sh <db1> <db2>
# ============================================================

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <db1> <db2>"
    exit 1
fi

DB1="$1"
DB2="$2"

if [ ! -f "$DB1" ]; then
    echo "❌ DB1 not found: $DB1"
    exit 1
fi

if [ ! -f "$DB2" ]; then
    echo "❌ DB2 not found: $DB2"
    exit 1
fi

echo "============================================================"
echo "  Schema Verification (structural)"
echo "============================================================"
echo "  DB1: $DB1"
echo "  DB2: $DB2"
echo ""

# ============================================================
# 1. Compare table list (ignore internal tracking tables)
# ============================================================
TABLES1=$(sqlite3 "$DB1" ".tables" | tr ' ' '\n' | grep -v '^$' | grep -v '^schema_migrations$' | sort)
TABLES2=$(sqlite3 "$DB2" ".tables" | tr ' ' '\n' | grep -v '^$' | grep -v '^schema_migrations$' | sort)

if [ "$TABLES1" != "$TABLES2" ]; then
    echo "❌ Table list MISMATCH:"
    diff <(echo "$TABLES1") <(echo "$TABLES2") || true
    exit 1
fi
echo "  ✅ Table list match ($(echo "$TABLES1" | wc -l) tables)"

# ============================================================
# 2. Compare columns per table (normalized)
# ============================================================
MISMATCH=0
for table in $TABLES1; do
    # Get column signature: name|type|notnull|dflt_value (sorted alphabetically)
    SIG1=$(sqlite3 "$DB1" "SELECT name || '|' || LOWER(type) || '|' || [notnull] FROM pragma_table_info('$table') ORDER BY name;")
    SIG2=$(sqlite3 "$DB2" "SELECT name || '|' || LOWER(type) || '|' || [notnull] FROM pragma_table_info('$table') ORDER BY name;")

    if [ "$SIG1" != "$SIG2" ]; then
        echo ""
        echo "  ❌ $table: COLUMN MISMATCH"
        diff <(echo "$SIG1") <(echo "$SIG2") | head -20
        MISMATCH=$((MISMATCH+1))
    fi
done

if [ $MISMATCH -gt 0 ]; then
    echo ""
    echo "❌ Total mismatches: $MISMATCH"
    exit 1
fi

echo "  ✅ All table columns match"

# ============================================================
# 3. Verify migration tracking (informational)
# ============================================================
echo ""
echo "  Migration tracking:"
MIG1=$(sqlite3 "$DB1" "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null || echo "")
MIG2=$(sqlite3 "$DB2" "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null || echo "")

if [ "$MIG1" = "$MIG2" ]; then
    echo "  ✅ Migration tracking match"
else
    echo "  ⚠️  Applied migrations differ (non-fatal)"
    echo "  DB1: $(echo "$MIG1" | wc -l) migrations"
    echo "  DB2: $(echo "$MIG2" | wc -l) migrations"
fi

echo ""
echo "============================================================"
echo "  ✅ SCHEMA PARITY OK (structural)"
echo "============================================================"