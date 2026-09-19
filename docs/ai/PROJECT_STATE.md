# Project State

**Last Updated:** 2026-09-18  
**Updated By:** AI #1 (Backend Owner)  
**Phase:** 3A CLOSED → 3B pending

---

## 1. Executive Summary

| Metric          | Value                           |
| --------------- | ------------------------------- |
| Backend Status  | ✅ Phase 3A closed              |
| Frontend Status | 🟡 Manual sync needed           |
| Multi-Tenant    | ✅ Active (1 tenant: `default`) |
| Production URL  | https://ujian.pw                |
| Load Test       | ✅ 1000 concurrent proven (P14) |
| Handoff Status  | `PARTIALLY_READY`               |

---

## 2. Backend Completed

### Authentication ✅

- Admin login (bcrypt + JWT)
- Super admin login (platform DB)
- Proctor login
- Peserta login (username + password encrypted AES-GCM)
- JWT generation + validation (HS256)
- Role-based access (SUPER_ADMIN, ADMIN, PROCTOR, TEACHER, PARTICIPANT)

### Multi-Tenant Infrastructure ✅

- Platform DB: `/var/lib/cbt/platform/platform.db`
- Tenant DB Manager (lazy open, LRU cache)
- Tenant registry (tenants table)
- Tenant resolver middleware (subdomain → tenant)
- Route scope separation (platform vs tenant)
- Per-tenant SQLite database

### Session & Exam ✅

- Session creation (exam_sessions table)
- Server-side timer (NOT_STARTED / ACTIVE / EXPIRED)
- Token rotating (rotated per 30 min, via worker — DISABLED temporarily)
- Verify token → JWT-B issuance
- Start exam → questions delivery (correct_option hidden)
- Autosave batching (`POST /exam/answers/batch`)
- Submit exam → scoring + result persistence

### Participant ✅

- Dashboard 3-section (scheduled / makeup / completed)
- Payment gate (block/unblock by admin)
- Auto-assign makeup session (attendance worker — DISABLED temporarily)

### Security ✅

- Rate limiting (nginx + Go: login, batch, submit)
- Security headers (HSTS, X-Frame, CSP, Referrer-Policy)
- Panic recovery (no stacktrace leak)
- Request ID (X-Request-ID)
- CORS strict (specific origins)
- Input validation
- AES-256-GCM for credentials
- JWT secret + encryption key from env

### Infrastructure ✅

- Modular app structure (`internal/app/`)
- Redis namespace `tenant:{uuid}:...`
- Nginx reverse proxy + HTTPS (Let's Encrypt)
- systemd service (auto-restart)
- Daily SQLite backup (cron)
- Logrotate
- fail2ban
- UFW firewall

### DevOps ✅

- Deploy script (`deploy-backend.sh`)
- Backup script (`/etc/cron.daily/cbt-backup`)
- Multi-tenant migration CLI (`cmd/migrate-tenants`)

---

## 3. Backend In Progress

### Phase 3B — Handler Migration 🟡

**Scope:** Migrate 57 handler method dari legacy pattern ke factory pattern.

**Current state:**

- 3 handler sudah migrated: `HandleAdminLogin`, `HandleSuperAdminLogin`, `HandleListSchools`
- 54 handler masih pakai `h.examUC`, `h.sessionUC`, `h.paymentUC` (legacy struct fields)
- **Tidak blocking untuk 1 tenant** (data isolasi via file DB terpisah)
- **Wajib untuk multi-tenant** (>1 tenant)

**ETA:** 6-8 jam (beberapa iterasi)

### Workers Temporarily Disabled 🟡

- **Token Rotator** — auto-rotate token proctor (disabled)
- **Attendance Worker** — auto-detect peserta absent (disabled)

**Alasan:** Butuh iterasi lintas-tenant (loop semua active tenants). Single-tenant iteration tidak compatible.

**Workaround sementara:**

- Token rotate manual via `POST /admin/sessions/:id/token/rotate`
- Attendance manual via admin endpoint

**ETA aktif kembali:** Phase 3B

---

## 4. Backend Remaining

| Phase | Scope                             | Priority | ETA     |
| ----- | --------------------------------- | -------- | ------- |
| 3B    | Handler migration (57 method)     | P0       | 6-8 jam |
| 3C    | Cleanup + isolation test suite    | P0       | 2 jam   |
| 4     | Exam lifecycle (DRAFT → PURGED)   | P1       | 3 jam   |
| 5     | Backup multi-tenant enhancement   | P1       | 1 jam   |
| 6     | D4 Participant Management (Excel) | P1       | 3 jam   |
| 7     | Proctoring dashboard real-time    | P2       | 4 jam   |

---

## 5. Frontend Impact

### Breaking Changes (Phase 3A)

1. **Login payload** — remove `tenant_id` (server-resolved)
2. **Multi-tenant URL** — subdomain pattern `{tenant}.ujian.pw`
3. **JWT payload** — `tenant_id` sekarang UUID, bukan subdomain

### Missing Endpoints

- `/admin/participants` (D4 deferred)

### Partial Endpoints

- Semua endpoint yang ada — **berfungsi normal**, hanya implementasi internal masih legacy

---

## 6. Frontend Blockers

| Blocker                         | Status                 | Owner           |
| ------------------------------- | ---------------------- | --------------- |
| Chrome cache TLS issue          | 🟡 Workaround: Firefox | User            |
| `/admin/participants` missing   | 🔴 Not implemented     | AI #1 (Phase 6) |
| Hardcoded values di AdminLayout | 🟡 Low priority        | AI #2           |

**Frontend tidak blocking** — bisa mulai sync dengan endpoint existing.

---

## 7. Data State

### Tenants

tenant_id: feb2b5b1-4895-4b46-a7ad-058c89e9a117
subdomain: default
npsn: 20254180
name: Default Tenant

### Users

admin / ADMIN / tenant_id=default
superadmin / SUPER_ADMIN / tenant_id=platform

### Exam Data

- **Tidak ada exam aktif** (dibersihkan di P15)
- **Tidak ada peserta** (dibersihkan di P15)
- Siap untuk seeding baru via CLI atau sync SIAKAD

---

## 8. Known Issues

| #   | Issue                         | Impact                 | Status               |
| --- | ----------------------------- | ---------------------- | -------------------- |
| 1   | Chrome cache TLS issue        | Frontend access        | 🟡 Workaround        |
| 2   | Workers disabled              | Auto-rotate/attendance | 🟡 Manual            |
| 3   | 57 handler legacy             | Internal only          | 🟡 No UX impact      |
| 4   | `/admin/participants` missing | Data Peserta page      | 🔴 Deferred          |
| 5   | Duplicate migration files     | `000003_*` (dari awal) | 🔴 Cleanup Phase 3C  |
| 6   | `mmap_size=256MB` global      | Multi-tenant memory    | 🟡 Reduce per-tenant |

---

## 9. Environment Variables (Production)

```env
APP_ENV=production
APP_PORT=:8082
DB_SOURCE=/var/lib/cbt/cbt.db
REDIS_ADDR=127.0.0.1:6379
REDIS_PASSWORD=
ALLOWED_ORIGIN=https://ujian.pw
JWT_SECRET=<32+ chars>
CREDENTIALS_ENCRYPTION_KEY=<64 hex chars>

# Multi-tenant (Phase 1)
MULTI_TENANT_MODE=false   # (tidak lagi dipakai — dihapus di Phase 3A)
PLATFORM_DB_PATH=/var/lib/cbt/platform/platform.db
TENANT_BASE_PATH=/var/lib/cbt
TENANT_MAX_OPEN=20
TENANT_IDLE_TTL_MINUTES=30
[VERIFY] — cek .env aktual untuk konfirmasi field ini.

10. Quick Health Check
bash
# Backend health
curl -s http://127.0.0.1:8082/health
# → {"service":"CBT Engine","status":"OK"}

# Platform endpoint
curl -s http://127.0.0.1:8082/api/v1/cbt/super/schools
# → {"status":"ok","data":[{"slug":"default","name":"Default Tenant",...}]}

# Admin login
curl -X POST http://127.0.0.1:8082/api/v1/cbt/auth/admin/login \
  -H "X-Tenant-Slug: default" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<from-seed>"}'
# → {"role":"ADMIN","token":"...","user":{...}}
11. Last Verified State
2026-09-18 19:21 — Setelah Phase 3A deploy:

✅ Backend healthy

✅ Admin login OK

✅ Platform endpoint OK

✅ Redis namespace OK

✅ Route scope separation OK

✅ Unit tests (6/6) PASS

12. Next Backend Task
Phase 3B — Handler Migration

Urutan:

Group handler by domain (low risk first)

Migrate per group

Test per group

Update BACKEND_CHANGELOG.md

Detail ada di BACKEND_GAPS.md Section "Phase 3B Plan".
```
