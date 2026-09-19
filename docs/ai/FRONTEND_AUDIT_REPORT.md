# FRONTEND AUDIT REPORT

**Auditor:** AI #2 (Frontend Owner)
**Date:** 2026-09-19
**Session:** 01
**Basis:** P1 source (7 files) + P2 tree + `.env.production` + `quasar.config.js`

---

## A. RINGKASAN

- Kontrak inti SELARAS: payload login tanpa `tenant_id`, `X-Tenant-Slug` di-inject,
  mock OFF di production, 401 handler membersihkan `cbt_*`.
- 3 BUG KRITIS pada RBAC & auth flow.
- 7 temuan HIGH, 5 temuan MEDIUM.

Prioritas: perbaiki AUTH + ROUTER sebelum modul lain.

---

## B. TEMUAN

### B.1 boot/axios.js — FUNCTIONAL

- ✅ X-Tenant-Slug inject
- ✅ 401 clear cbt\_\*
- 🟡 401 TIDAK clear `cbt_exam_id` → stale session

### B.2 stores/auth.js — PARTIALLY_FUNCTIONAL

- 🔴 B.2.1 API LocalStorage inkonsisten: `setItem`/`removeItem` (bukan API Quasar)
- 🟠 B.2.2 Role code inkonsisten antar jalur login
- 🟡 B.2.3 `setExamToken` set `cbt_exam_id`, `clearSession` tidak clear

### B.3 services/AuthService.js — FUNCTIONAL

- ✅ Semua endpoint benar
- ✅ Payload `{username, password}`, tanpa `tenant_id`

### B.4 router/index.js — BROKEN 🔴

- 🔴 B.4.1 /super TIDAK ter-proteksi RBAC (`role` singular tidak dibaca)
- 🔴 B.4.2 dashboardMap pakai `ADMIN_SEKOLAH`/`GURU_PROKTOR` (bukan `ADMIN`/`PROCTOR`)
- 🟠 B.4.3 Fallback unauthenticated selalu `/auth/participant`
- 🟡 B.4.4 Guard baca LocalStorage langsung (bukan useAuthStore)

### B.5 routes.js — PARTIALLY_FUNCTIONAL

- 🟠 B.5.1 Meta field campur: `role`/`roles`/`allowedRoles`
- 🟠 B.5.2 Route ke endpoint NOT_READY (`/admin/participants`, `/proctor/monitoring/:id`)
- 🟡 B.5.3 `/exam` pakai `roles` bukan `allowedRoles`

### B.6 utils/tenant.js — PARTIALLY_FUNCTIONAL

- 🟠 B.6.1 Fallback `'default'` di production root domain → kemungkinan backend reject
- 🟡 B.6.2 Komentar masih `ulangan.co.id`
- 🟡 B.6.3 Tidak ada fallback eksplisit dev

### B.7 composables/super/useTenant.js — FUNCTIONAL

- ✅ Graceful fallback 404
- 🟡 `TenantService.getConfig` endpoint NEEDS_VERIFICATION

### B.8 .env.production — FUNCTIONAL

- ✅ QCLI_MOCK_MODE=false, QCLI_API_BASE_URL=/api/v1/cbt

### B.9 quasar.config.js — PARTIALLY_FUNCTIONAL

- 🔴 B.9.1 `boot: []` kosong → `$api`/`$axios` global tidak ter-set
- 🟠 B.9.2 vueRouterMode: 'hash'
- 🟡 B.9.3 vite-plugin-checker aktif → build bisa fail oleh lint

---

## C. KLASIFIKASI MODUL

| Modul                          | Klasifikasi          |
| ------------------------------ | -------------------- |
| boot/axios.js                  | FUNCTIONAL           |
| stores/auth.js                 | PARTIALLY_FUNCTIONAL |
| services/AuthService.js        | FUNCTIONAL           |
| router/index.js                | BROKEN               |
| routes.js                      | PARTIALLY_FUNCTIONAL |
| utils/tenant.js                | PARTIALLY_FUNCTIONAL |
| composables/super/useTenant.js | FUNCTIONAL           |
| quasar.config.js               | PARTIALLY_FUNCTIONAL |
| .env.production                | FUNCTIONAL           |

---

## D. MAPPING PAGE → ENDPOINT

(lihat tabel di chat — banyak NEEDS_VERIFICATION, akan dilengkapi di sesi lanjutan)

---

## E. REKOMENDASI PRIORITAS

### P0 (BLOCKER — sebelum modul lain)

1. B.4.1 Fix RBAC `/super` (privilege escalation)
2. B.4.2 Fix `dashboardMap` role code
3. B.2.1 Konfirmasi & perbaiki API LocalStorage di `auth.js`

### P1 (HIGH)

4. B.9.1 Daftarkan `boot/axios.js` di `quasar.config.js`
5. B.4.3 Fallback login sesuai role
6. B.5.1 Standardisasi meta → `allowedRoles` saja
7. B.5.2 Handle route NOT_READY dengan placeholder
8. B.2.2 Konsistenkan role code
9. B.6.1 Fix fallback tenant slug
10. B.1 Clear `cbt_exam_id` di 401

### P2 (MEDIUM)

11. B.4.4 Guard baca dari useAuthStore
12. B.2.3 clearSession hapus cbt_exam_id
13. B.5.3 Standardisasi `/exam`
14. B.9.3 Review lint rule
15. Lengkapi mapping endpoint (P3 file source)

---

## F. NEXT SESSION

- Verifikasi source: `stores/admin/dashboard.js`, `stores/admin/questions.js`,
  `stores/admin/users.js`, `stores/exam/*`, `stores/super/*`,
  `services/admin/*`, `services/exam/*`, `services/super/*`.
- Verifikasi endpoint `TenantService.getConfig`.

## UPDATE — 2026-09-19 (setelah jawaban AI #1)

### CLARIFICATIONS APPLIED
- Role codes = source of truth: ADMIN, SUPER_ADMIN, PROCTOR, TEACHER, PARTICIPANT.
  → B.2.2, B.4.2 naik ke P0 CONFIRMED.
- Tenant fallback 'default' di root domain = aman (backend accept X-Tenant-Slug: default).
  → B.6.1 CLOSED — NOT A BUG.
- Endpoint NOT_READY (/admin/participants, /proctor/monitor/:id, import-excel)
  = expected. Handle 404 gracefully. → B.5.2 CONFIRMED, bukan bug.
- Backend FIX #1 (HandleGetTenantConfig) sudah diimplement.
  → B.7 useTenant FUNCTIONAL.

### DAFTAR PRIORITAS FINAL

#### P0 — BLOCKER (sebelum modul lain)
1. B.4.1 — Fix RBAC `/super` (meta `role` singular → `allowedRoles`)
2. B.4.2 — Fix `dashboardMap` di `router/index.js`: ganti
   `ADMIN_SEKOLAH` → `ADMIN`, `GURU_PROKTOR` → `PROCTOR`
3. B.2.1 — Konfirmasi API LocalStorage di `stores/auth.js`
   (`setItem`/`removeItem` vs `set`/`remove`)
4. B.2.2 — Konsistenkan role code dari input & response login

#### P1 — HIGH
5. B.9.1 — Daftarkan `boot/axios.js` di `quasar.config.js` `boot: []`
6. B.4.3 — Fallback login sesuai role (`/super` → `/auth/super`, dst.)
7. B.5.1 — Standardisasi meta route → `allowedRoles` saja
8. B.5.2 — Placeholder UI untuk route NOT_READY (Participants, ProctorMonitoring)
9. B.1   — Clear `cbt_exam_id` di 401 interceptor

#### P2 — MEDIUM
10. B.4.4 — Guard baca dari `useAuthStore`, bukan `LocalStorage` langsung
11. B.2.3 — `clearSession` hapus `cbt_exam_id`
12. B.5.3 — `/exam` pakai `allowedRoles`
13. B.9.3 — Review ESLint rule untuk build production
14. Mapping endpoint lengkap (butuh source store/service admin/exam/super)