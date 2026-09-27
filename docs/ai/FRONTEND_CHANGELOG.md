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

## [2b-3-jadwal] — 2026-09-27 — Jadwal Ujian (Wizard + Print) + Refactor Arsitektur

### Added

- **Master Ruang Ujian** di Data Referensi (`/admin/references/rooms`)
  - CRUD lengkap: nama, gedung, lantai, kapasitas, keterangan, aktif
  - Soft warning di `ClassFormDialog` saat ruang dipakai kelas lain
- **Field `ruang_id` + `ruang_nama`** di Kelas/Rombel
- **Wizard Jadwal Ujian** (4 langkah):
  - Step 1: Konteks (jenis ujian, TA, semester)
  - Step 2: Mapel WAJIB — semua tingkat, group by tingkat, "Isi Semua Sama"
  - Step 3: Mapel KEJURUAN — group by tingkat → sub-group jurusan (SMK/MAK saja)
  - Step 4: Assign Kelas & Pengawas (auto-generate kelas match + auto-assign pengawas round-robin)
- **List view** dengan filter (search, jenis ujian, tingkat, tanggal) + kolom Kelas & Pengawas summary
- **Edit Jadwal** dialog maximized — ubah tanggal/jam + edit assign kelas/pengawas
- **Print PDF Jadwal** via `pdfmake` — layout per tingkat → per hari → table
- Service baru: `ExamScheduleService`, `RoomService`
- Composable: `useExamScheduleWizard`, `useExamSchedulePrint`, `useRoomManagement`
- Helper murni: `src/utils/exam/scheduleHelpers.js` (calcEndTime, buildTingkatList, buildDetailsForRow, autoAssignPengawas, groupSchedulesByTingkatTanggal)
- Template PDF: `src/utils/pdf/examScheduleTemplatePdf.js`

### Changed

- **`ExamManagement.vue` refactor total** — dari prototipe `super/ExamScheduleManagement` → wizard 4 langkah sesuai model per-tingkat × waktu
- **`useClasses.js`** — tambah `ruang_id` di EMPTY_FORM + `openEditDialog`
- **`ClassFormDialog.vue`** — tambah field Ruang Ujian + soft warning konflik (props `ruangOptions`, `classList`, `editingId`)
- **`classesData.js` + `classesHandlers.js`** — field `ruang_id`, `ruang_nama` + derive ruang nama

### Refactor — Arsitektur (Opsi A)

- **Hapus semua import `@/mocks/*`** dari `pages/`, `composables/`, `components/`
- Semua data via Service (`StudentService`, `TeacherService`, `ClassService`, `RoomService`, `SubjectService`, `ExamTypeService`, `SchoolProfileService`, `ExamService`, `ProgramKeahlianService`, `ExamScheduleService`)
- Helper murni dipindah ke `src/utils/exam/scheduleHelpers.js` (tidak lagi di `mocks/data/`)

### Deferred

- Import/Export CSV jadwal ujian
- Denah Duduk (2b-3d)
- Daftar Pengawas (2b-3b) — **data `details` sudah siap**
- Berita Acara (2b-3c)

## [refactor-arch] — 2026-09-27 — Bersihkan Import Mock dari Layer UI

### Fixed

- `KartuUjianPrint.vue` — ganti `mockStudents`/`mockSchoolProfiles`/`mockExamsFull` → `StudentService`/`SchoolProfileService`/`ExamService`
- `ExamManagement.vue` — ganti `mockExamTypes`/`calcEndTime` → `ExamTypeService`/`@/utils/exam/scheduleHelpers`
- `ExamScheduleAssignStep.vue` — terima `teachers` via props (tidak import mock)

### Verification

- `grep -rn "@/mocks/" frontend/src/pages frontend/src/composables frontend/src/components` → hanya komentar, 0 import aktif

## [2b-3b] — 2026-09-27 — Daftar Pengawas Ujian

### Added

- **Halaman Cetak Daftar Pengawas** (`/admin/cetak-dokumen/daftar-pengawas`)
- **Template PDF landscape** via pdfmake — 8 kolom (No, Ruang, Kelas, Mapel, Jam, Pengawas 1, Pengawas 2, TTD)
- **TTD 2 kolom**: Kepala Sekolah + Ketua Panitia
- **Filter opsional**: tanggal, ruang, jenis ujian (default kosong — tampil semua)
- **Stats bar**: total jadwal, ruang terpakai, pengawas bertugas, belum di-assign
- Composable `useProctorListPrint`
- Service auto-load via `SchoolProfileService`, `ExamTypeService`, `ExamScheduleService`
- **Flatten view**: setiap (jadwal × detail kelas) = 1 baris, sort by jam lalu ruang

### Changed

- Hub `CetakDokumenUjian.vue` — kartu "Daftar Pengawas" **aktif** (dari disabled)

### Edge Case

- Baris tanpa pengawas → italic abu **"Belum di-assign"** (di UI & PDF)

### Deferred

- Ketua Panitia otomatis dari setting (belum ada field)
- Export Excel
- Group by ruang (opsi alternatif)

## [2b-3c] — 2026-09-27 — Berita Acara (Master Template + Generate Lembar Isian)

### Added

- **2b-3c-1: Master Template Editor** (`/admin/cetak-dokumen/berita-acara-template`)
  - Editor rich text (QEditor) untuk paragraf pembuka, sampul, kondisi
  - Header (judul + 2 sub-judul)
  - Konfigurasi statistik peserta (label + toggle)
  - Checklist kejadian dinamis (tambah/hapus/toggle enable)
  - Toggle tampilkan: daftar siswa, TTD pengawas, TTD kepala, TTD panitia
  - Simpan per tenant via `X-Tenant-Slug`
- **2b-3c-2: Generate Lembar Isian** (`/admin/cetak-dokumen/berita-acara`)
  - Flatten jadwal × detail kelas → 1 baris per BA
  - Filter: tanggal, ruang, jenis ujian
  - Cetak single (ikon per baris) / bulk (checkbox + Cetak Terpilih)
  - PDF portrait A4 — auto-fill data jadwal (hari/tgl/bulan/tahun, mapel, kelas, ruang, jam, pengawas)
  - Blank field untuk diisi manual: No BA, jumlah peserta, eksemplar sampul, checklist ☐, catatan, TTD
  - Opsional: halaman daftar hadir siswa + kolom TTD per siswa
  - TTD blok: Pengawas 1 & 2, Kepala Sekolah, Ketua Panitia
- Service: `BeritaAcaraService` (getTemplate/saveTemplate)
- Composable: `useBeritaAcaraTemplate`, `useBeritaAcaraPrint`
- Template PDF: `beritaAcaraTemplatePdf.js` (portrait, auto-fill + blank form)
- Mock: `beritaAcaraTemplateData.js` (multi-tenant), `beritaAcaraTemplateHandlers.js`

### Changed

- Hub `CetakDokumenUjian.vue` — kartu "Berita Acara" aktif → ke halaman generate BA

### Deferred

- Render bold/italic dari QEditor di PDF (saat ini jadi plain text)
- Nomor BA otomatis (increment per tenant)
- Export BA terisi (setelah pengawas input digital)
- Template conditional per jenis ujian
