# Frontend Change Request

**Owner:** AI Implementasi #2  
**Target:** AI Implementasi #1 (Backend Owner)

---

## ⚠️ Purpose

Ketika frontend butuh perubahan backend, **jangan** langsung edit backend. Buat request di sini.

AI #1 akan review + implement + update changelog.

---

## Format

Setiap request punya ID: `REQ-001`, `REQ-002`, ...

Status: `PENDING` / `ACKNOWLEDGED` / `IN_PROGRESS` / `DONE` / `REJECTED`

Priority: `BLOCKER` / `HIGH` / `MEDIUM` / `LOW`

---

## REQ-000 — Template (Copy This)

````markdown
## REQ-XXX

**Date:** YYYY-MM-DD
**Priority:** BLOCKER / HIGH / MEDIUM / LOW
**Status:** PENDING

### Con

[Why frontend needs this]

### Current Backend Behavior

[What backend does now]

### Expected Behavior

[What frontend needs]

### Affected Endpoints

- METHOD /path
- METHOD /path

### Affected Frontend Modules

- src/pages/...
- src/stores/...
- src/services/...

### Suggested Implementation (optional)

[If you have idea how backend should implement]

### Impact if Not Implemented

[What breaks in frontend]

### Notes

[Anything else]

---

REQ-001 — Example (akan dihapus setelah ada request nyata)
markdown

## REQ-001

**Date:** 2026-09-18
**Priority:** LOW
**Status:** ACKNOWLEDGED

### Con

Admin dashboard menampilkan Quick Stats "Total Soal" yang hardcoded ke 75.

### Current Backend Behavior

`GET /admin/dashboard/stats` return:

- total_exams
- total_participants
- active_sessions
- completed_exams

**Tidak ada `total_questions`.**

### Expected Behavior

Tambahkan `total_questions` di response.

### Affected Endpoints

- `GET /api/v1/cbt/admin/dashboard/stats`

### Affected Frontend Modules

- `src/layouts/AdminLayout.vue`

### Suggested Implementation

```go
_ = examDB.DB.QueryRowCon(ctx, `SELECT COUNT(*) FROM questions`).Scan(&totalQuestions)
return c.JSON(fiber.Map{
    "total_questions": totalQuestions,
    // ...
})
Impact if Not Implemented
Quick Stats tampil 75 (hardcoded). Kosmetik.

Notes
Sudah tercatat di BACKEND_GAPS.md — Phase 3B.



---

## Active Requests Summary

| ID | Date | Priority | Status | Summary |
|----|------|----------|--------|---------|
| REQ-001 | 2026-09-18 | LOW | ACKNOWLEDGED | Add `total_questions` to dashboard stats |

**Update table saat ada request baru / status berubah.**

---

## Instructions

1. **Jangan buat request** untuk hal yang sudah diketahui (lihat `BACKEND_GAPS.md`)
2. **Jangan buat request** yang memerlukan perubahan arsitektur tanpa diskusi
3. **Sertakan con yang cukup** — AI #1 tidak akan chat langsung dengan Anda
4. **Ping dengan cara commit** — push ke git agar AI #1 bisa pull
5. **Kompilasi** — kalau ada 5 request serupa, group jadi 1 request

---

## Backend Responses (from AI #1)

### Response to Audit Session 01 (2026-09-19)

AI #1 acknowledge audit report. Summary:

**No new change requests detected** — audit findings mostly frontend-only.

**Backend clarifications provided** (see `BACKEND_CHANGELOG.md`):

1. Role codes: `ADMIN`, `SUPER_ADMIN`, `PROCTOR`, `TEACHER`, `PARTICIPANT`
2. Tenant fallback: works via `X-Tenant-Slug` header injection
3. Endpoints NOT_READY confirmed (Phase 6, 7)

**Backend fix delivered:** `HandleGetTenantConfig` now returns real tenant data.

**Action for AI #2:**
- Continue P0/P1 fixes in `FRONTEND_AUDIT_REPORT.md`
- Update `TenantService.getConfig` expectation (endpoint now stable)
- After P0 fixes, do second audit pass untuk store/service modules

---
```
````

## CR-QR-LOGIN — QR Login Flow

**Konteks:** Kartu Ujian cetak berisi QR opaque token. Siswa scan → login tanpa ketik user/pass.

### Endpoints dibutuhkan

#### 1. Generate / Regenerate QR token (admin)

POST /admin/cards/{id}/qr/regenerate
Response: { qr_token: "abc...", expires_at: null }

#### 2. QR Login (student)

POST /qr/login
Body: { qr_token, device_fingerprint }
Success 200: { jwt, user, redirect: "/student" }
Error:

- 401 { code: "invalid_token" }
- 403 { code: "card_revoked" }
- 403 { code: "card_expired" }
- 403 { code: "device_mismatch" }
- 429 { code: "rate_limited" }

#### 3. Reset device binding (admin)

POST /admin/cards/{id}/reset-device
Response: { success: true }

### Security Rules (per keputusan PO)

- Token opaque 128-bit, bukan NIS/password
- HTTPS only
- Device binding hybrid: bind di login pertama, admin bisa reset
- Rate limit 5 attempt/menit/card
- Session JWT TTL: 1 jam
- Audit log: semua login tercatat (IP, device, timestamp, result)
- Revoke → token instant invalid

### Deferred

- Halaman `/qr/:token` di frontend (sub-fase 2b-3a-2)

## CR-CARD-QR — Kartu Ujian & QR Login Flow

**Status:** Draft (deferred — frontend mock dulu)
**Konteks:** Kartu Ujian cetak berisi QR opaque token. Siswa scan → login tanpa ketik user/pass.

### Endpoints dibutuhkan

#### 1. List / CRUD Kartu

- `GET  /admin/cards?search=&card_type=&status=`
- `POST /admin/cards` — { student, card_type, expiry_date?, reason? }
- `POST /admin/cards/{id}/revoke`
- `POST /admin/cards/{id}/reset-device`
- `POST /admin/cards/{id}/mark-printed`

#### 2. QR Login (Student)

- `POST /qr/login`
  - Body: `{ qr_token, device_fingerprint }`
  - Success 200: `{ jwt, user, redirect: "/student" }`
  - Error: `401 invalid_token` / `403 card_revoked` / `403 card_expired` / `403 device_mismatch` / `429 rate_limited`

#### 3. Regenerate QR (Admin)

- `POST /admin/cards/{id}/qr/regenerate`
  - Response: `{ qr_token, signature_qr_token }`

#### 4. Verify Signature QR

- `GET /verify/card/{card_number}?h={hash}`
  - Response: `{ valid: bool, card: {...}, school: {...} }`

### Security Rules (locked — keputusan PO)

- Token opaque 128-bit, bukan NIS/password
- HTTPS only
- Device binding **hybrid**: bind di login pertama, admin bisa reset kapan saja
- Rate limit: 5 attempt/menit/card
- Session JWT TTL: **1 jam**
- Audit log: IP, device, timestamp, result
- Revoke → token instant invalid
- Kartu TEMPORARY: PIN 4 digit (2FA ringan) + expiry_date
- Kartu PERMANENT: tidak expire (kecuali di-revoke)

### Frontend Flow (2b-3a-2 — belum diimplementasi)

1. Halaman `/qr/:token` — deteksi + auto login
2. Kirim `POST /qr/login` dengan `device_fingerprint` (fingerprintjs atau UA+screen hash)
3. Sukses → simpan JWT → redirect `/student`
4. Gagal device mismatch → tampil pesan "Kartu sudah terikat ke device lain. Hubungi proktor."

### Data Kartu (field dari backend)

id, card_number, student_id, student_name, student_nis, student_nisn,
student_photo_url, class_id, class_nama,
card_type ('PERMANENT'|'TEMPORARY'),
status ('ACTIVE'|'EXPIRED'|'REVOKED'),
qr_token (32 hex), signature_qr_token (32 hex),
username, password, pin (nullable),
device_fingerprint (nullable), device_bound_at (nullable),
expiry_date (nullable), reason (nullable),
printed_at (nullable), printed_by (nullable),
created_at

### Deferred Backend Dependencies

- CR-CARD-QR-LOGIN — endpoint `/qr/login`
- CR-CARD-SIGNATURE — endpoint `/verify/card/...`
- CR-CARD-CRUD — endpoint `/admin/cards/*`
- VER-CARD — migrasi kartu dari mock → DB
