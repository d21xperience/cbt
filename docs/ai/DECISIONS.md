# Architecture Decisions Log

Keputusan arsitektur signifikan yang mempengaruhi arah proyek.

**Format:** ADR-style (Architecture Decision Record)

---

## ADR-001: SQLite Per Tenant

**Date:** 2026-09-17  
**Status:** ✅ Implemented (Phase 1)  
**Deciders:** Project owner, AI #1

### Con
Aplikasi akan melayani multiple sekolah (SaaS). Butuh isolasi data yang kuat, backup/restore per sekolah, dan independence antar tenant.

### Decision
**1 tenant sekolah = 1 SQLite database.**
/var/lib/cbt/
├── platform/platform.db ← registry
└── tenants/
└── {tenant-uuid}/
└── cbt.db



### Alternatives Considered
- **A. Shared SQLite + `tenant_id` column** — rejected: tidak ada isolation real
- **B. PostgreSQL dengan RLS** — rejected: target deployment 2 CPU / 2 GB RAM, tidak feasible
- **C. Database per tenant (chosen)** — feasible untuk SQLite, isolation kuat

### Consequences
- ✅ Isolation benar (file level)
- ✅ Backup per sekolah
- ✅ Restore per sekolah
- 🟡 Butuh `TenantDBManager` dengan LRU cache
- 🟡 Perlu per-tenant PRAGMA (memory tuning)

---

## ADR-002: NPSN = Global Business Identity

**Date:** 2026-09-17  
**Status:** ✅ Implemented

### Con
Multi-tenant SaaS butuh identitas unik per sekolah.

### Decision
NPSN = global business identity (unique, dari Kemdikbud)
tenant_id = internal system identity (UUID)
subdomain = access address (URL-friendly)



**NPSN WAJIB unique** — self-registration dan super admin registration menggunakan rule yang sama. Duplikat NPSN = reject.

### Consequences
- ✅ Integrasi dengan sistem Kemdikbud
- ✅ Tidak ada sekolah dengan NPSN sama
- 🟡 Perlu validasi NPSN di semua entry point (self-register, admin create)

---

## ADR-003: JWT Contains UUID Tenant, DB Uses Subdomain

**Date:** 2026-09-18  
**Status:** ✅ Implemented (Phase 3A)  
**Trigger:** Bug saat Phase 3A testing

### Con
Login admin gagal karena JWT tenant (UUID) tidak match dengan `tenant_id` di DB (subdomain).

### Decision
- **JWT claim `tenant_id`** = UUID (`feb2b5b1-...`)
- **Tenant DB `tenant_id` column** = subdomain (`default`)
- **Factory routing** ke DB file pakai UUID
- **DB query** `WHERE tenant_id = ?` pakai subdomain

Mapping via `TenantInfo`:
```go
type TenantInfo struct {
    TenantID  string  // UUID (untuk routing + JWT)
    Subdomain string  // string (untuk DB query)
    DBPath    string  // absolute path
}
Rationale
UUID = global system identifier (tidak berubah)

Subdomain = business identifier (mudah di-read manusia)

File DB path pakai UUID (unique, tidak mengandung special chars)

Consequences
✅ Konsisten dengan ADR-002

🟡 Butuh awareness: JANGAN pakai info.TenantID untuk DB query di tenant DB

🟡 Untuk DB query: pakai info.Subdomain (atau fallback ke "default")

ADR-004: Redis Namespace Per Tenant
Date: 2026-09-18
Status: ✅ Implemented (Phase 3A)

Con
Redis single-instance shared across tenants. Tanpa namespace, key collision antar tenant bisa terjadi.

Decision
Semua key WAJIB pakai prefix tenant:{tenant-id}:.

Helper:

go
func RedisKey(tenantID string, parts ...string) string {
    // "tenant:{uuid}:{part1}:{part2}..."
}
Konsekuensi
❌ NO FlushAll() — hanya delete by pattern tenant:{id}:*

❌ NO global key (mis. queue:essay_grading tanpa prefix)

✅ TTL per key: default 12 jam, heartbeat 30 detik

Consequences
✅ Isolation Redis

🟡 Perlu refactor semua Redis key existing (Phase 3A: sebagian sudah)

🟡 queue:essay_grading belum di-refactor (Phase 3B)

ADR-005: Route Scope Separation
Date: 2026-09-18
Status: ✅ Implemented (Phase 3A)

Con
Tidak semua endpoint butuh tenant. Platform endpoint (/super/*) harus bekerja tanpa subdomain tenant.

Decision
Dua scope:

Scope	Prefix	Tenant Required
Platform	/api/v1/cbt/super/*, /api/v1/cbt/auth/super/login	❌
Tenant	/api/v1/cbt/auth/{admin,exam,proctor}/login, /admin/*, /proctor/*, /exam/*	✅
Middleware:

TenantResolver — OPTIONAL (semua request, tidak fail kalau tidak ada)

RequireTenant — fail 400 kalau tidak ada tenant

TenantGuard — verify JWT tenant match resolved tenant (Phase 3B akan aktifkan)

Consequences
✅ Platform endpoint works tanpa tenant

✅ Tenant endpoint fail clear kalau tidak ada tenant

🟡 Butuh konsistensi route registration

ADR-006: Modular App Structure
Date: 2026-09-18
Status: ✅ Implemented (Phase 3A)

Con
main.go awalnya ~400 baris. Susah navigate, high merge conflict risk.

Decision

cmd/server/main.go                 ← entry point (8 baris)
internal/app/
├── app.go                         ← Run() orchestrator
├── infra.go                       ← Init DB, Redis, Factory
├── fiber_setup.go                 ← Fiber config + middleware
├── routes.go                      ← Route registration
├── worker.go                      ← Workers placeholder
└── server.go                      ← Start + graceful shutdown
Rationale
Testability: setiap init function bisa di-test

Maintainability: file kecil, jelas

Merge conflict ↓

Onboarding ↑

Consequences
✅ Struktur jelas

🟡 Butuh konvensi: perubahan di file mana untuk apa

✅ main.go tidak berubah kecuali entry point

ADR-007: Drop Legacy Single-Tenant Mode
Date: 2026-09-18
Status: ✅ Decided (drop di Phase 3C)

Con
Awalnya ada feature flag MULTI_TENANT_MODE=true/false. Dual mode memperlambat + memperumit.

Decision
DROP legacy mode. Production & development WAJIB multi-tenant.

Dev environment buat tenant dev (bukan single-tenant).

Consequences
✅ Kode simpler (satu path)

✅ Dev menyerupai production

🟡 Butuh setup tenant di dev environment

ADR-008: Question Snapshot Required Before Purge
Date: 2026-09-17
Status: 🔴 Planned (Phase 4)

Con
Retention policy butuh hapus question bank lama. Tapi hasil ujian harus tetap auditable.

Decision
WAJIB ada answer_snapshots sebelum implementasi purge.

sql
CREATE TABLE answer_snapshots (
    participant_id, exam_id, question_id,
    question_,          -- snapshot
    options,                -- snapshot JSON
    correct_option,         -- snapshot
    participant_answer,
    score_earned,
    ...
);
Consequence
✅ Hasil ujian auditable setelah purge

🟡 Storage: ~20 MB per exam (1000 peserta × 40 soal)

🔴 Belum diimplementasi

ADR-009: Workers Must Be Tenant-Aware
Date: 2026-09-18
Status: 🔴 Blocked (Phase 3B)

Con
Workers (Token Rotator, Attendance) awalnya single-tenant. Multi-tenant butuh loop semua active tenants.

Decision
Worker WAJIB:

Iterate all active tenants (dari platform DB)

Per tenant: dapatkan DB handle via TenantManager

Jalankan logic per tenant

Handle failure per tenant (tidak crash global)

Consequences
🔴 Phase 3A: workers DISABLED sementara

🟡 Phase 3B: refactor worker

🟡 Manual rotate token sampai worker aktif

ADR-010: No Cross-Tenant Access (Hard Rule)
Date: 2026-09-17
Status: ✅ Hard rule

Decision
Tenant A TIDAK BOLEH:

Read/Write/Update/Delete data tenant B

Lihat tenant B ID, exam B, participant B

Akses session B, result B

Kecuali: SUPER_ADMIN dengan explicit authorization untuk platform operations.

Enforcement
File DB terpisah (physical isolation)

RequireRole + TenantGuard (application isolation)

JWT claim validation

Redis namespace

Consequences
✅ Defense in depth

✅ Setiap perubahan harus test isolation

ADR-011: Rate Limiting Two Layers
Date: 2026-09-16
Status: ✅ Implemented

Decision
Rate limiting di dua layer:

Nginx — limit_req_zone per IP

Go middleware — limiter.New per IP/userID

Layer order:


Request → Nginx rate limit → Go rate limit → Handler
Load test bypass:

Env LOAD_TEST_TOKEN + header X-Load-Test-Token → skip Go limiter

Nginx: map directive untuk skip kalau header match

Consequences
✅ Defense in depth

✅ Load test bisa bypass (dengan token)

🟡 Konsistensi 429 response (tidak 503)

Decision Queue (Pending)
#	Topic	Priority	Target Phase
1	Exam lifecycle (DRAFT..PURGED)	P1	Phase 4
2	Question snapshot implementation	P1	Phase 4
3	Multi-tenant backup strategy	P1	Phase 5
4	Excel import (D4)	P2	Phase 6
5	Proctoring dashboard real-time	P3	Phase 7
6	Auto-migration on startup	P3	TBD
Changelog
Date	Change
2026-09-18	Initial ADR log (ADR-001..011)