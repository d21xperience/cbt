# Scripts — Environment Sync

Tools untuk menjaga **dev** dan **production** tetap sinkron.

## Files

| Script                    | Purpose                               |
| ------------------------- | ------------------------------------- |
| `migrations-manifest.txt` | Mapping migration → target DB         |
| `migrate.sh`              | Apply pending migrations (idempotent) |
| `seed-all.sh`             | Idempotent seed (superadmin, admin)   |
| `verify-schema.sh`        | Compare schema parity between 2 DBs   |
| `sync-env.sh`             | Master orchestrator                   |

## Usage

### Dev — one command

```bash
cd backend
./scripts/sync-env.sh --dev
```
