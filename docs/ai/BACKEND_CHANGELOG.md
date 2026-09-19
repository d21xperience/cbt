# Backend Changelog

Setiap perubahan backend yang **berdampak frontend** dicatat di sini.

**Format:** `[DATE] [SCOPE] [IMPACT]`

---

## 2026-09-18 — Phase 3A: Multi-Tenant Foundation

### [2026-09-18] [ARCH] [HIGH] — Modular App Structure

**Changed:** `cmd/server/main.go` dipecah jadi 6 file di `internal/app/`.

**Old:** `main.go` ~400 baris, semua wiring inline.

**New:**
cmd/server/main.go ← 8 baris
internal/app/app.go ← Run()
internal/app/infra.go ← InitInfra + Close
internal/app/fiber_setup.go ← SetupFiber
internal/app/routes.go ← RegisterRoutes
internal/app/worker.go ← StartWorkers
internal/app/server.go ← RunServer

text

**Frontend Impact:** NONE (internal only)

---

### [2026-09-18] [AUTH] [HIGH] — Login Payload Tidak Ada `tenant_id`

**Changed:** Login admin/proctor/peserta **TIDAK menerima `tenant_id`** di body.

**Old:**

```json
POST /auth/admin/login
{ "username": "admin", "password": "xxx", "tenant_id": "default" }
New:

json
POST /auth/admin/login
{ "username": "admin", "password": "xxx" }
Header: X-Tenant-Slug: default
Reason: Tenant di-resolve server-side (subdomain atau header), tidak trust client.

Frontend Action: ✅ Hapus tenant_id dari semua payload login.

[2026-09-18] [AUTH] [HIGH] — JWT tenant_id Berisi UUID
Changed: JWT claim tenant_id sekarang berisi UUID, bukan subdomain.

Old:

json
{ "uid": "...", "role": "ADMIN", "tenant_id": "default" }
New:

json
{ "uid": "...", "role": "ADMIN", "tenant_id": "feb2b5b1-4895-4b46-a7ad-058c89e9a117" }
Frontend Action: Jika frontend decode JWT, sesuaikan parsing.

[2026-09-18] [REDIS] [NONE] — Tenant Namespace
Changed: Semua Redis key pakai prefix tenant:{uuid}:.

Old: exam:answers:{examID}:{participantID}
New: tenant:{uuid}:exam:answers:{examID}:{participantID}

Frontend Impact: NONE (internal, autosave behavior tetap sama)

[2026-09-18] [INFRA] [NONE] — Route Scope Separation
Changed: Route dipisah jadi platform scope + tenant scope.

Platform:

/super/*

/auth/super/login

Tenant:

/auth/{admin,exam,proctor}/login

/admin/*, /proctor/*, /exam/*

Frontend Impact: NONE (URL path tidak berubah)

[2026-09-18] [AUTH] [MEDIUM] — /super/schools Return Real Data
Changed: GET /super/schools sekarang baca dari platform DB.

Old: Hardcoded stub:

json
{ "slug": "default", "name": "CBT Engine", ... }
New: Dari platform.db.tenants:

json
{ "slug": "default", "name": "Default Tenant", "npsn": "20254180", ... }
Frontend Action: ✅ Verifikasi landing page render nama tenant dengan benar.

[2026-09-18] [SECURITY] [HIGH] — CORS Strict
Changed: CORS AllowOrigins sekarang specific, tidak wildcard.

Old: https://ujian.pw,https://*.ujian.pw
New: https://ujian.pw

Reason: Browser tidak support wildcard di CORS origin.

Frontend Action: NONE — frontend tetap akses dari https://ujian.pw.

[2026-09-18] [INFRA] [LOW] — Workers Temporarily Disabled
Changed: Token Rotator + Attendance Worker DISABLED (Phase 3A).

Reason: Butuh tenant-aware iteration (Phase 3B).

Workaround:

Token rotate manual via POST /admin/sessions/:id/token/rotate

Attendance manual via admin endpoint

Frontend Action:

✅ Proctor: setelah 30 menit token expired, klik "Rotate" manual

✅ Admin: cek absen manual

2026-09-17 — Phase 2A/2B: Schema & Critical Fixes
[2026-09-17] [ARCHIVE] [CRITICAL] — Fix FlushAll() Redis
Changed: Archive tidak lagi FlushAll() Redis.

Old: redis.FlushAll() — hapus semua key semua tenant.

New: Scoped delete by tenant pattern.

Frontend Impact: NONE.

[2026-09-17] [ARCHIVE] [CRITICAL] — Tenant-Scoped Reset
Changed: Archive reset (semester/year) sekarang tenant-scoped.

Old: DELETE FROM exam_results (semua tenant)
New: DELETE FROM exam_results WHERE tenant_id = ?

Frontend Impact: NONE.

[2026-09-17] [SCHEMA] [NONE] — tenant_id Column Added
Changed: Tambah tenant_id TEXT DEFAULT 'default' ke 11 tabel tenant.

Tables: admins, exam_results, exam_sessions, participant_sessions, eligible_participants, questions, exams, participant_credentials, payment_gates, exam_tokens, proctor_assignments.

Frontend Impact: NONE.

2026-09-16 — Phase 1: Multi-Tenant Foundation
[2026-09-16] [ARCH] [HIGH] — Database Per Tenant
Changed: Split jadi platform.db + tenants/{uuid}/cbt.db.

Old: Single cbt.db untuk semua.
New: 1 tenant = 1 DB.

Frontend Impact: NONE.

[2026-09-16] [SCHEMA] [NONE] — Platform DB Created
Changed: Tabel baru: tenants, platform_users, subscriptions, platform_audit_log.

Frontend Impact: NONE.

Changelog Format Legend
Impact levels:

NONE — tidak affect frontend

LOW — frontend opsional update

MEDIUM — frontend sebaiknya update

HIGH — frontend WAJIB update

BLOCKER — frontend tidak bisa jalan sampai update

Status tags:

✅ Applied — sudah deploy production

🟡 In Progress

🔴 Blocked

⏸️ Pending
```
