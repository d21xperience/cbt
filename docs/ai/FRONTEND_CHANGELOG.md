---

## 📄 FILE 10 — `docs/ai/FRONTEND_CHANGELOG.md`

```markdown
# Frontend Changelog

**Owner:** AI Implementasi #2  
**Format:** `[DATE] [SCOPE] [IMPACT]` (sama dengan backend changelog)

---

## ⚠️ Instructions

- Catat **setiap perubahan frontend** yang signifikan
- **Breaking changes** terhadap kontrak backend WAJIB dicatat
- Reference ID (mis. `FC-001`) untuk traceability
- Impact levels: `NONE` / `LOW` / `MEDIUM` / `HIGH` / `BLOCKER`

---

## Legend

**Impact:**

- `NONE` — cosmetic only
- `LOW` — minor improvement
- `MEDIUM` — visible behavior change
- `HIGH` — affects UX flow
- `BLOCKER` — must fix to keep app functional

**Status:**

- ✅ Applied
- 🟡 In Progress
- 🔴 Blocked
- ⏸️ Pending

---

## 2026-09-18 — Initial Setup

### [2026-09-18] [SETUP] [NONE] — Initial Docs Read

**Changed:** N/A

**Notes:**

- AI #2 kicked off
- Read `ARCHITECTURE_BASELINE.md`, `BACKEND_CONTRACT.md`, `FRONTEND_HANDOFF.md`
- Audit pending

**Status:** ✅

---

## Template — Copy This

```markdown
### [YYYY-MM-DD] [SCOPE] [IMPACT] — Title

**ID:** FC-XXX

**Changed:**
[what changed]

**Old:**
[before]

**New:**
[after]

**Reason:**
[why]

**Files Changed:**

- file → reason

**Test:**

- [ ] Build PASS
- [ ] Manual test PASS

**Status:** ✅ / 🟡 / 🔴

**Backend Impact:**
NONE / [describe]

## 2026-09-19 — Session 01 — P0 Fixes

### Fixed

- **B.4.1 (BLOCKER)** `router/index.js` — RBAC `/super` tidak terbaca karena meta `role` singular. Guard sekarang membaca `allowedRoles` (fallback `roles`/`role` legacy). Privilege escalation ditutup.
- **B.4.2 (BLOCKER)** `router/index.js` — `dashboardMap` pakai role code lama `ADMIN_SEKOLAH`/`GURU_PROKTOR`. Diganti ke `ADMIN`/`PROCTOR`/`TEACHER` sesuai kontrak backend.
- **B.4.3 (HIGH)** `router/index.js` — Fallback unauthenticated selalu ke `/auth/participant`. Sekarang sesuai prefix route (`/super`→`/auth/super`, dst).
- **B.2.1 (BLOCKER)** `stores/auth.js` — `LocalStorage.setItem`/`removeItem` bukan API Quasar. Diganti ke `LocalStorage.set`/`LocalStorage.remove`.
- **B.2.2 (BLOCKER)** `stores/auth.js` — role code dinormalisasi ke uppercase di semua jalur login.
- **B.2.3 (MEDIUM)** `stores/auth.js` — `clearSession` sekarang hapus `cbt_exam_id`.
- **B.1 (HIGH)** `boot/axios.js` — 401 handler sekarang hapus `cbt_exam_id`.
- **B.9.1 (HIGH)** `quasar.config.js` — `boot: []` → `boot: ['axios']`. `$api`/`$axios` global tersedia.
- **B.5.1 (HIGH)** `routes.js` — standardisasi meta route ke `allowedRoles`. Field `role`/`roles` dihapus.

### Docs

- FRONTEND_STATE.md — update status modul.
- FRONTEND_AUDIT_REPORT.md — tandai P0 closed.

### Backend

- Tidak ada perubahan. Clarification AI #1 sudah menutup B.6.1 dan B.5.2.
```

## [2b-3a] — 2026-09-26 — Kartu Ujian + Menu Cetak Dokumen Ujian

### Added

- Menu baru "Cetak Dokumen Ujian" (hub 5 dokumen)
- Halaman `/admin/cetak-dokumen` — hub
- Halaman `/admin/cetak-dokumen/kartu-ujian` — Kartu Ujian
- `ExamCardService.js`, `cardsData.js`, `cardsHandlers.js`
- `cardTemplatePdf.js` (pdfmake, CR80, 10/A4)
- `useExamCardPrint.js` composable
- QR opaque token (32 hex char) — mengganti `SERIAL:xxx` lama
- Device binding hybrid (Q-B) + tombol reset (Q-E)
- PIN 4 digit untuk TEMPORARY (Q-C)

### Changed

- Kartu Ujian: buang `localStorage`, pakai Service + Mock
- Print: `window.open` → `pdfmake`
- Layout: blok 350px → CR80 grid 2×5

### Deferred

- Login QR flow (butuh backend, lihat FRONTEND_CHANGE_REQUEST.md)
- Daftar Pengawas (2b-3b)
- Berita Acara (2b-3c)
- Denah Duduk (2b-3d)
- Aturan Ujian (2b-3e)
- Export + Share (2b-3f)
## [2b-3a + 2b-3a-1] — 2026-09-27 — Kartu Ujian + Menu Cetak Dokumen Ujian

### Added
- **Menu baru "Cetak Dokumen Ujian"** di section Manajemen Ujian
- Halaman hub `/admin/cetak-dokumen` (5 dokumen: Kartu Ujian, Daftar Pengawas, Berita Acara, Denah Duduk, Aturan Ujian)
- Halaman `/admin/cetak-dokumen/kartu-ujian` — Kartu Ujian (list, filter, create, print, revoke, reset-device)
- Service: `ExamCardService.js`
- Mock: `cardsData.js` + `cardsHandlers.js`
- Composable: `useExamCardPrint.js`
- Template PDF: `cardTemplatePdf.js` (pdfmake, CR80, 10/A4)

### Security — QR Login (P1–P4 locked)
- QR opaque token 32-hex-char — mengganti `SERIAL:xxx` lama
- Format URL: `{origin}/qr/{token}` (bukan NIS + password)
- Device binding hybrid (bind di login pertama, admin reset via tombol)
- PIN 4 digit untuk kartu TEMPORARY
- Audit log: semua login akan dicatat (backend, deferred)
- Session JWT TTL: 1 jam
- Signature QR (kecil, di footer) = verifikasi keaslian kartu

### Changed
- Kartu Ujian: buang `localStorage` (`exam_cards`, `appData`, `exam_data`) → pakai Service + Mock
- Print engine: `window.open` → **pdfmake** (PDF native, tajam)
- Layout: blok 350px → CR80 grid 2×5 = 10 kartu/A4
- Header kartu: logo (kiri) + nama sekolah + alamat + No. Kartu (kanan)
- Footer kartu: foto placeholder | ttd Kepala Sekolah + QR kecil | QR besar login
- Sisi belakang: tabel jadwal ujian (kode mapel, hari, tanggal, jam)
- Duplex flip long-edge: kolom belakang di-mirror

### Deferred (Backend)
- Endpoint QR login: `POST /qr/login`, `POST /admin/cards/{id}/qr/regenerate`
- Halaman `/qr/:token` di frontend (2b-3a-2)
- Halaman `/verify/card/:cardNumber` untuk signature QR
- Migrasi kartu dari mock → API backend (VER-CARD)

### Next
- 2b-3b — Daftar Pengawas (per hari)
- 2b-3c — Berita Acara (editable template)
- 2b-3d — Denah Duduk (editor + print)
- 2b-3e — Aturan Ujian (master baru)
- 2b-3f — Export + Share