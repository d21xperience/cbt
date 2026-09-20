## [LOW] Nil-slice → JSON null di TenantDB.scanMany

**File:** `internal/platform/repository/tenant_db.go:97, 233`
**Pattern:**
```go
var out []domain.PublicSchoolDTO   // line 97
var out []domain.Tenant            // line 233
Dampak: kalau DB kosong → response "data":null (bukan [])

Frontend data.length akan crash

Terjadi di: GET /super/schools, GET /public/schools, GET /super/schools/pending
Konteks: Production tidak terpengaruh (sudah ada tenant). Dev DB bisa kosong.
Fix: Ganti var out []T → out := make([]T, 0)
Sudah difix untuk KeahlianDB di VER-008 — pattern sama.
Priority: LOW — fix di batch berikutnya.

# Backend Gaps & TODO

**Last Updated:** 2026-09-18

---

## Priority Legend

- 🔴 **P0** — Critical (blocking production)
- 🟠 **P1** — High (blocking multi-tenant)
- 🟡 **P2** — Medium (nice to have)
- 🟢 **P3** — Low (future)

---

## Phase 3B — Handler Migration 🟠 P1

**Scope:** Migrate 54 handler method dari legacy pattern ke factory.

**Current:**
- ✅ Migrated: `HandleAdminLogin`, `HandleSuperAdminLogin`, `HandleListSchools`
- 🔴 Legacy: 54 handlers masih pakai `h.examUC`, `h.sessionUC`, `h.paymentUC`, dll

**Impact:**
- Saat ini **tidak affect** frontend (1 tenant)
- **Wajib** sebelum multi-tenant (>1 tenant)

**Plan:**

| Group | Handlers | Risk |
|-------|----------|------|
| A. Low risk (payment, makeup, sync) | 8 | 🟢 |
| B. Medium (admin exam mgmt) | 12 | 🟡 |
| C. Medium (participant dashboard) | 5 | 🟡 |
| D. High (exam runtime) | 10 | 🔴 |
| E. High (archive) | 2 | 🔴 |
| F. Misc (proctor, credentials) | 17 | 🟢 |

**ETA:** 6-8 jam

---

## Workers Tenant-Aware 🟠 P1

**Issue:** Token Rotator & Attendance Worker **DISABLED** sejak Phase 3A.

**Reason:** Worker awalnya single-tenant. Multi-tenant butuh iterasi lintas-tenant.

**Workaround sekarang:**
- Token rotate manual via `/admin/sessions/:id/token/rotate`
- Attendance manual via admin endpoint

**Fix Plan:**
1. Buat `internal/app/workers.go` worker orchestrator
2. Loop all active tenants dari platform DB
3. Per tenant: dapat DB handle → jalankan worker logic
4. Handle failure per tenant (tidak crash global)

**ETA:** Bagian dari Phase 3B (~1 jam)

---

## Migration Cleanup 🟡 P2

**Issue:** Duplicate migration file prefix `000003_*` dari iterasi awal.

**Files:**
000003_add_essay_scores.up.sql
000003_add_external_participants.up.sql



**Risk:** Migration tool (golang-migrate) bisa error karena duplicate prefix.

**Current Mitigation:** Migration dijalankan manual via `for f in migrations/*.up.sql`.

**Fix Plan:**
- Rename `000003_add_essay_scores.up.sql` → `000003_add_essay_scores.up.sql`
- Rename `000003_add_external_participants.up.sql` → `000004_add_external_participants.up.sql`
- Shift subsequent files
- Verify idempotent

**ETA:** 30 menit

---

## `total_questions` Field Missing 🟡 P2

**Issue:** `/admin/dashboard/stats` tidak return `total_questions`.

**Impact:** Frontend `AdminLayout.vue` Quick Stats hardcoded "Total Soal: 75".

**Fix:**
```go
// handler.go — HandleDashboardStats
_ = examDB.DB.QueryRowCon(ctx, `SELECT COUNT(*) FROM questions`).Scan(&totalQuestions)
// ...
return c.JSON(fiber.Map{
    // ...
    "total_questions": totalQuestions,  // NEW
})
ETA: 5 menit

mmap_size Global Too Large 🟡 P2
Issue: Global mmap_size=268435456 (256 MB) per DB. Multi-tenant → total memory = N × 256 MB.

Impact: 20 tenant = 5 GB mmap (melebihi VPS 2 GB).

Current Mitigation: Per-tenant PRAGMA sudah diturunkan ke 64 MB (manager.go):

go
PRAGMA mmap_size=67108864;  // 64 MB
Fix Plan:

✅ Sudah applied di Phase 3A (manager.go)

Verify tidak ada PRAGMA global yang override

Status: 🟢 Low risk

Question Snapshot 🔴 P0 (Sebelum Purge)
Issue: questions table tidak ada snapshot. Kalau dihapus → hasil ujian tidak auditable.

Decision: ADR-008 — WAJIB ada answer_snapshots sebelum purge.

Schema:

sql
CREATE TABLE answer_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id  NOT NULL,
    exam_id  NOT NULL,
    question_id  NOT NULL,
    question_  NOT NULL,
    question_type  NOT NULL,
    options ,
    correct_option ,
    score_max REAL,
    participant_answer ,
    score_earned REAL,
    graded_at DATETIME,
    graded_by ,
    UNIQUE(participant_id, exam_id, question_id)
);
Populate: Saat FinishExam.

ETA: Phase 4 (~2 jam)

Exam Lifecycle 🔴 P0 (Untuk Retention)
Issue: exams table tidak punya status lifecycle.

Decision: ADR-001 (Phase 4).

Schema:

sql
ALTER TABLE exams ADD COLUMN status  DEFAULT 'DRAFT';
ALTER TABLE exams ADD COLUMN finalized_at DATETIME;
ALTER TABLE exams ADD COLUMN archived_at DATETIME;
ALTER TABLE exams ADD COLUMN purge_scheduled_at DATETIME;
Lifecycle: DRAFT → READY → RUNNING → SUBMITTED → GRADED → FINALIZED → ARCHIVED → PURGED

ETA: Phase 4 (~1 jam)

D4 Participant Management ❌ Missing
Issue: /admin/participants endpoint belum ada.

Impact: Frontend Data Peserta page tampil "Belum ada data peserta".

Business Decision (Confirmed):

Excel import untuk EXTERNAL peserta only

SIAKAD peserta tidak boleh overwrite

Excel template: NISN, name, rombel_name, subject_name, school_name, semester_id

Max 5000 rows, max 5 MB

Duplicate NISN dalam 1 file → error

Endpoints Needed:


GET    /api/v1/cbt/admin/participants              — list + filter
GET    /api/v1/cbt/admin/participants/stats        — count per source
GET    /api/v1/cbt/admin/participants/template     — download Excel
POST   /api/v1/cbt/admin/participants/import-excel — preview
POST   /api/v1/cbt/admin/participants/import-confirm — commit
DELETE /api/v1/cbt/admin/participants/:id          — delete
ETA: Phase 6 (~4 jam)

Proctoring Dashboard 🔴 Missing
Issue: Endpoint untuk real-time monitoring peserta belum ada.

Endpoints Needed:


GET /api/v1/cbt/proctor/monitor/:sessionId     — grid peserta + status
GET /api/v1/cbt/proctor/monitor/:sessionId/:pid — detail peserta
Data Needed:

Online status (dari Redis heartbeat)

Warning count

Lock status

Current question

Time remaining

ETA: Phase 7 (~4 jam)

Multi-Tenant Backup 🟠 P1
Issue: Backup script /etc/cron.daily/cbt-backup masih backup single DB.

Fix:

bash
# Loop all tenants
for tenant_dir in /var/lib/cbt/tenants/*/; do
    tenant_id=$(basename "$tenant_dir")
    sqlite3 "$tenant_dir/cbt.db" "VACUUM INTO '$BACKUP_DIR/tenant_${tenant_id}_$DATE.db'"
done
ETA: Phase 5 (~1 jam)

Rate Limit Status Code 🟢 P3
Issue: Nginx return 503 (default) bukan 429 untuk rate limit.

Fix: (sudah di-apply)

nginx
limit_req_status 429;
limit_conn_status 429;
Status: ✅ Applied

.env MULTI_TENANT_MODE 🟢 P3
Issue: Field MULTI_TENANT_MODE tidak dipakai lagi setelah Phase 3A.

Fix: Hapus dari .env dan config.go.

ETA: Phase 3C (5 menit)

Chrome Cache TLS Issue 🟢 P3
Issue: Chrome kadang ERR_CONNECTION_CLOSED untuk ujian.pw.

Root Cause: Chrome TLS session ticket + socket pool stale setelah backend restart.

Fix: Workaround (user side):

Firefox

Incognito

Flush Chrome socket pools

Fix Backend? Tidak ada. Ini client-side issue.

Status: 🟡 Known limitation

Summary Table
#	Gap	Priority	Phase	ETA
1	Handler migration (54 methods)	🟠 P1	3B	6-8 jam
2	Workers tenant-aware	🟠 P1	3B	1 jam
3	Migration cleanup	🟡 P2	3C	30 menit
4	total_questions field	🟡 P2	3B	5 menit
5	mmap_size per-tenant	🟢 P3	✅ Done	—
6	Question snapshot	🔴 P0	4	2 jam
7	Exam lifecycle	🔴 P0	4	1 jam
8	D4 Participant Management	❌ Missing	6	4 jam
9	Proctoring dashboard	❌ Missing	7	4 jam
10	Multi-tenant backup	🟠 P1	5	1 jam