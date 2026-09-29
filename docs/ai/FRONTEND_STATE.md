# FRONTEND STATE

**Last update:** 2026-09-19 by AI #2 (Session 01)

## STATUS PER MODUL

| Modul             | State                | Notes                                               |
| ----------------- | -------------------- | --------------------------------------------------- |
| Auth Store        | PARTIALLY_FUNCTIONAL | API LocalStorage inkonsisten, role code inkonsisten |
| Auth Service      | FUNCTIONAL           | Sesuai kontrak backend                              |
| Boot Axios        | FUNCTIONAL           | X-Tenant-Slug OK, 401 OK (kecuali cbt_exam_id)      |
| Router Guard      | BROKEN               | /super tidak ter-proteksi RBAC                      |
| Routes            | PARTIALLY_FUNCTIONAL | Meta field campur, route ke endpoint NOT_READY      |
| Utils Tenant      | PARTIALLY_FUNCTIONAL | Fallback 'default' perlu diperbaiki                 |
| Composable Tenant | FUNCTIONAL           | Endpoint config NEEDS_VERIFICATION                  |
| quasar.config.js  | PARTIALLY_FUNCTIONAL | boot:[] kosong                                      |
| Mock              | SAFE                 | Hanya aktif di DEV                                  |
| .env.production   | FUNCTIONAL           | QCLI_MOCK_MODE=false                                |

## BUILD STATUS

Belum diverifikasi di sesi ini. Perlu `npm run build`.

## BLOCKERS

- Source store/service admin/exam/super belum tersedia untuk mapping lengkap endpoint.
- Endpoint `/admin/participants` (Phase 6) dan `/proctor/monitor/:sessionId` (Phase 7) belum ada.

## NEXT ACTION

Tunggu konfirmasi user untuk mulai implementasi P0/P1.

# FRONTEND STATE

**Last update:** 2026-09-19 by AI #2 (Session 01 — P0 fixes)

## STATUS PER MODUL

| Modul             | State         | Notes                                                     |
| ----------------- | ------------- | --------------------------------------------------------- |
| Auth Store        | ✅ FUNCTIONAL | LocalStorage API + role normalize + clearSession lengkap  |
| Auth Service      | ✅ FUNCTIONAL | Sesuai kontrak backend                                    |
| Boot Axios        | ✅ FUNCTIONAL | X-Tenant-Slug + 401 clear lengkap                         |
| Router Guard      | ✅ FUNCTIONAL | RBAC /super fixed, dashboardMap fixed, fallback per-route |
| Routes            | ✅ FUNCTIONAL | Meta standardized ke `allowedRoles`                       |
| Utils Tenant      | ✅ FUNCTIONAL | Fallback 'default' aman (backend accept)                  |
| Composable Tenant | ✅ FUNCTIONAL | Backend fix #1 sudah live                                 |
| quasar.config.js  | ✅ FUNCTIONAL | Boot file terdaftar                                       |
| Mock              | ✅ SAFE       | Hanya aktif di DEV                                        |
| .env.production   | ✅ FUNCTIONAL | QCLI_MOCK_MODE=false                                      |

## PRIORITY BACKLOG

- P1: placeholder UI `/admin/participants` & `/proctor/monitoring/:id`
- P2: guard baca dari useAuthStore (bukan LocalStorage langsung)
- P2: verifikasi lint `vite-plugin-checker` di production build
- P2: mapping endpoint lengkap (butuh source store/service admin/exam/super)

## BUILD STATUS

⏳ Belum diverifikasi. Menunggu `npm run build` oleh user.

## BLOCKERS

Tidak ada.

### ✅ S2c — Question Renderer Responsive — DONE (2026-09-29)

**Baseline (S2c):**

- Q8: font `clamp()` responsive — MathText, QuestionRenderer
- Q10: scroll container untuk tabel/gambar lebar — .qr-media-scroll
- Q11: lock overlay mobile adjustment — ExamLockOverlay
- Files: MathText.vue, QuestionRenderer.vue, PGQuestion.vue,
  EssayQuestion.vue, AudioQuestion.vue, ExamLockOverlay.vue

**S2c-b (renderer baru):**

- 7 file baru di `frontend/src/components/questions/`:
  TrueFalseQuestion, ShortAnswerQuestion, MatchingQuestion, PGComplexQuestion,
  CodingQuestion, HotspotQuestion, VideoQuestion
- `QuestionRenderer.vue` dispatch 10 tipe (sebelumnya 3)

**Coverage:** 10/10 tipe soal ✅

**Test:** S2c T1–T17 PASS · S2c-b1 T1–T14 PASS · S2c-b2 T1–T21 PASS ·
S2c-b3 T1–T26 PASS · S2c-b4 T1–T15 PASS
