# VER-007 + VER-008 Consolidated Report

**Status:** ✅ CLOSED — Functional Test PASS (23/23)
**Date:** 2026-09-20
**Owner:** AI #1 (Backend)
**Audience:** AI #2 (Frontend) + maintainer

---

## 1. Ringkasan

### VER-007 Extension — Master Bidang & Program Keahlian

SMK/MAK support: master data 10 bidang + 23 program, dengan admin tenant
self-service (find-or-create + assign/remove).

### VER-008 — Clarifications untuk Frontend

Jawaban 3 pertanyaan AI #2 (status field `jenjang`, embedding `bidang_nama`,
non-SMK behavior) + fix nil-slice bug yang ditemukan saat audit.

---

## 2. Contract Final (LOCKED)

### 2.1 Public endpoints (no auth)

**`GET /api/v1/cbt/public/references/bidang-keahlian`**

```json
{
  "status": "ok",
  "data": [
    {"id":"TI","nama":"Teknologi Informasi","deskripsi":"...","sort_order":1,"created_at":"..."},
    ...  // 10 items total
  ],
  "count": 10
}
GET /api/v1/cbt/public/references/program-keahlian
Query (opsional): ?bidang=TI, ?default=true

json
{
  "status": "ok",
  "data": [
    {
      "id": "prog-tkj",
      "bidang_id": "TI",
      "kode": "TKJ",
      "nama": "Teknik Komputer dan Jaringan",
      "deskripsi": "",
      "is_default": true,
      "is_custom": false,
      "created_by": "",
      "sort_order": 1,
      "created_at": "2026-09-20T02:14:40Z",
      "bidang_nama": "Teknologi Informasi"   // ← SELALU embedded
    },
    ...  // 23 items (all) / 6 (default) / 4 (bidang=TI)
  ],
  "count": 23
}
2.2 Admin endpoints (JWT + tenant scope)
Header: Authorization: Bearer <token>
Tenant context: dari subdomain atau X-Tenant-Slug

POST /api/v1/cbt/admin/program-keahlian/find-or-create

json
// Request
{"kode":"TKP","nama":"Teknik Kapal","bidang_id":"BANGUNAN","deskripsi":""}

// Response 200 (existing)
{"status":"ok","created":false,"data":{...program object...}}

// Response 201 (new)
{"status":"ok","created":true,"data":{...,"is_custom":true,"created_by":"<admin-uuid>"}}
GET /api/v1/cbt/admin/programs

json
{"status":"ok","data":[{...program objects assigned to tenant...}],"count":N}
Kosong → "data":[], count:0, HTTP 200

BUKAN 404

POST /api/v1/cbt/admin/programs/assign

json
// Request
{"program_id":"<uuid>"}
// Response
{"status":"ok","message":"Program berhasil di-assign"}
POST /api/v1/cbt/admin/programs/remove

json
// Request
{"program_id":"<uuid>"}
// Response
{"status":"ok","message":"Program dihapus dari tenant"}
2.3 Tenant config (VER-007 Original — juga sudah applied)
GET /api/v1/cbt/super/schools/:slug/config

json
{
  "slug": "smkjaya",
  "npsn": "12345678",
  "school_name": "SMK Jaya",
  "jenjang": "SMK",                    // ← NEW
  "program_duration_years": 3,         // ← NEW
  "logo_url": "",
  "is_suspended": false,
  "is_active": true
}
Default kalau tenant kosong: jenjang="SMA", program_duration_years=3.

Jenjang valid: SMP, MTs, SMA, MA, SMK, MAK.
Duration valid: 1-6.

3. Jawaban untuk AI #2 (VER-008)
Q1 — jenjang + program_duration_years
SUDAH APPLIED. Frontend bisa langsung pakai. Auto-populate grade:

SMP/MTs → 7-9

SMA/MA → 10-12

SMK/MAK → 10-{10+duration-1} (mis. duration=3 → 10-12, duration=4 → 10-13)

Contoh:

js
const cfg = await api.get(`/super/schools/${slug}/config`)
const base = {SMP:7, MTs:7, SMA:10, MA:10, SMK:10, MAK:10}[cfg.jenjang] || 10
const count = (cfg.jenjang === 'SMP' || cfg.jenjang === 'MTs') ? 3 : cfg.program_duration_years
const grades = Array.from({length: count}, (_,i) => base + i)
Q2 — bidang_nama
SUDAH EMBEDDED di semua response. Tidak perlu join manual.

Q3 — Non-SMK behavior
GET /admin/programs untuk tenant tanpa program → {"data":[],"count":0} HTTP 200

Tidak ada field is_smk — frontend yang tentukan UI berdasarkan jenjang dari config

Rekomendasi UI:

js
if (programs.length === 0 && !['SMK','MAK'].includes(cfg.jenjang)) {
  // Hide section "Jurusan"
} else if (programs.length === 0 && ['SMK','MAK'].includes(cfg.jenjang)) {
  // Empty state "Belum ada jurusan. Tambah sekarang."
} else {
  // Render list jurusan
}
4. Seed Data Baseline (migration 000017)
10 Bidang:
TI, OTO, BISNIS, ELEKTRO, MESIN, BANGUNAN, KESEHATAN, AGRI, PARIWISATA, SENI

23 Program (6 default):

Kode	Bidang	Default
TKJ	TI	✅
RPL	TI	✅
MM	TI	—
TKJ4	TI	—
TKR	OTO	✅
TSM	OTO	✅
TBSM	OTO	—
AKL	BISNIS	✅
MPLB	BISNIS	✅
BDP	BISNIS	—
OTKP	BISNIS	—
TAV	ELEKTRO	—
TEI	ELEKTRO	—
TPM	MESIN	—
TFLM	MESIN	—
DPIB	BANGUNAN	—
TKP	BANGUNAN	—
AKF	KESEHATAN	—
ATP	AGRI	—
APHP	AGRI	—
UPW	PARIWISATA	—
PH	PARIWISATA	—
DKV	SENI	—
Catatan: kickoff menyebut "~24 program, 7 default" — actual = 23 program, 6 default.
Angka ini jadi baseline scripts/verify-backend.sh.

5. Yang BERUBAH di Contract
RegisterSchoolRequest: field bidang_keahlian_id dan program_keahlian_ids
DIHAPUS. Sekolah daftar simpel (NPSN, nama, jenjang). Admin kelola jurusan
self-service setelah login.
Tidak ada breaking — field ini tidak pernah diserialisasi sebelumnya.

"Route /admin/program-keahlian/*" dan "/admin/programs/*": dipindah dari platform
scope ke tenant scope (registerAdminRoutes). URL path sama — frontend tidak
terpengaruh.

6. Known Limitation (LOW priority)
Nil-slice → JSON null di TenantDB.scanMany:

File: internal/platform/repository/tenant_db.go:97, 233

Pattern: var out []domain.Tenant dan var out []domain.PublicSchoolDTO

Dampak: kalau DB kosong → response "data":null (bukan []) → frontend .length crash

Terjadi di: GET /super/schools, GET /public/schools, GET /super/schools/pending

Production aman (sudah ada tenant) tapi tetap bug laten

Fix: out := make([]T, 0) (sudah diterapkan di KeahlianDB untuk VER-008)

Priority: LOW — fix di batch berikutnya

7. Verification Tools
scripts/verify-backend.sh
Static verification (no server): fmt, vet, build, test, migration tables, seed count, latent bugs.
Idempotent. Exit 0 = all PASS.

scripts/verify-endpoints.sh
Functional verification (server running): 23 assertions across 11 test groups.
Auto-login, auto-cleanup test artifacts. Exit 0 = all PASS.

Prerequisite functional:

cd backend && ./dev-be.sh (backend running di :8082)

Admin dev: admin / admin123

sqlite3 CLI available

8. File Reference (single source of truth)
Concern	File
Domain types	internal/platform/domain/keahlian.go
Repository	internal/platform/repository/keahlian_db.go
HTTP handler	internal/cbt/delivery/http/handler_keahlian.go
Routes	internal/app/routes.go (registerPlatformRoutes + registerAdminRoutes)
Wiring	internal/app/infra.go (PlatformKeahlian)
Migration up	migrations/000017_add_master_keahlian.up.sql
Migration down	migrations/000017_add_master_keahlian.down.sql
Manifest	scripts/migrations-manifest.txt
Verification	scripts/verify-backend.sh, scripts/verify-endpoints.sh
9. Status
VER-007 Extension: ✅ APPLIED + TESTED

VER-007 Original (jenjang + duration): ✅ APPLIED

VER-008 Clarifications: ✅ RESPONDED

Deploy to production: ⏳ PENDING (migration 000017 belum apply ke VPS)
```
