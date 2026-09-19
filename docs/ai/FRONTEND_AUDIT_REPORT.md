# Frontend Audit Report

**Owner:** AI Implementasi #2  
**Date Started:** `YYYY-MM-DD`  
**Date Completed:** `[pending]`  
**Status:** `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`

---

## ⚠️ Purpose

Audit awal frontend **sebelum coding**. Tanpa audit, perubahan besar berisiko:

- Duplikasi logic
- Breaking existing feature
- Mismatch dengan kontrak backend

---

## Section A — Contract Mapping

Untuk setiap page kritikal, mapping end-to-end:
Page → Store → Service → Axios → Backend Endpoint → Handler → Status

text

**Format:**

| Page               | Store           | Service           | Endpoint                     | Backend Status | Frontend Status | Mismatch                         |
| ------------------ | --------------- | ----------------- | ---------------------------- | -------------- | --------------- | -------------------------------- |
| Admin Dashboard    | adminDashboard  | DashboardService  | `GET /admin/dashboard/stats` | ✅             | `UNKNOWN`       | `field total_questions missing`  |
| Admin Participants | adminDashboard  | ...               | `GET /admin/participants`    | ❌ Missing     | `UNKNOWN`       | `404`                            |
| Admin Login        | auth            | AuthService       | `POST /auth/admin/login`     | ✅             | `UNKNOWN`       | `payload masih kirim tenant_id?` |
| Participant Login  | auth            | AuthService       | `POST /auth/exam/login`      | ✅             | `UNKNOWN`       | `?`                              |
| Super Admin Login  | auth            | AuthService       | `POST /auth/super/login`     | ✅             | `UNKNOWN`       | `?`                              |
| Exam Room          | examActive      | ActiveExamService | `/exam/*`                    | ✅             | `UNKNOWN`       | `?`                              |
| Waiting Room       | examWaitingRoom | ?                 | `/exam/dashboard`            | ✅             | `UNKNOWN`       | `?`                              |
| Token Display      | ?               | ?                 | `/admin/sessions/:id/token`  | ✅             | `UNKNOWN`       | `?`                              |
| Payment Gate       | ?               | ?                 | `/admin/payments/*`          | ✅             | `UNKNOWN`       | `?`                              |

**Fill this table during audit.**

---

## Section B — Mismatch Summary

### B1. Missing Endpoints

| Endpoint                                | Used By            | Impact | Action                |
| --------------------------------------- | ------------------ | ------ | --------------------- |
| `GET /admin/participants`               | `Participants.vue` | HIGH   | Wait for Phase 6 (D4) |
| `POST /admin/participants/import-excel` | `Participants.vue` | MEDIUM | Wait for Phase 6      |

### B2. Contract Mismatch

| Frontend call                                     | Backend contract         | Delta                         |
| ------------------------------------------------- | ------------------------ | ----------------------------- |
| e.g. `payload: { username, password, tenant_id }` | `{ username, password }` | `tenant_id` should be removed |

### B3. Fields Missing / Extra

| Endpoint                     | Frontend expects                        | Backend returns                                                         | Delta                     |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------------------- | ------------------------- |
| `GET /admin/dashboard/stats` | `{ totalQuestions, totalParticipants }` | `{ total_exams, total_participants, active_sessions, completed_exams }` | Missing `total_questions` |

### B4. Auth Pattern

- [ ] Axios interceptor inject `X-Tenant-Slug` correct?
- [ ] JWT storage correct (LocalStorage via Quasar)?
- [ ] 401 handling correct (auto logout)?
- [ ] Route guard consistent with RBAC?

**Fill during audit.**

---

## Section C — Mock vs Real API

Frontend existing `mocks/` folder — audit:

| Mock handler       | Production impact     | Action                        |
| ------------------ | --------------------- | ----------------------------- |
| `authHandlers.js`  | Should be OFF in prod | Verify `QCLI_MOCK_MODE=false` |
| `adminHandlers.js` | Should be OFF in prod | Idem                          |
| ...                | ...                   | ...                           |

**Verify build**: `npm run build` → grep dist untuk "mockInterceptor" → should be empty.

---

## Section D — Outdated Code Candidates

Files/functions yang tidak sinkron dengan kontrak backend **aktual**:

| File | Reason | Action            |
| ---- | ------ | ----------------- |
| ...  | ...    | REFACTOR / REMOVE |

**Fill during audit.**

---

## Section E — Functional Classification

Klasifikasi per modul:

| Module             | Classification         | Notes            |
| ------------------ | ---------------------- | ---------------- |
| Admin Dashboard    | `UNKNOWN`              |                  |
| Admin Participants | `PARTIALLY_FUNCTIONAL` | Endpoint missing |
| ...                | ...                    | ...              |

**Fill during audit.**

---

## Section F — Risk Assessment

| Risk | Level        | Mitigation |
| ---- | ------------ | ---------- |
| ...  | LOW/MED/HIGH | ...        |

---

## Section G — Recommended Work Order

Priority list untuk perbaikan:

1. **[BLOCKER]** Verify mock OFF di production build
2. **[HIGH]** Fix login payload (remove tenant_id)
3. **[HIGH]** Wire dashboard stats ke `/admin/dashboard/stats`
4. **[MEDIUM]** Data Peserta — tampilkan fallback yang jelas
5. **[LOW]** Hapus hardcoded values

**Refine setelah audit selesai.**

---

## Section H — Verification Steps

Setelah audit selesai, jalankan:

```bash
# Build
npm run build

# Verify no mock in build
grep -r "mockInterceptor" dist/spa/ || echo "OK — no mock in build"

# Verify login payload
grep -r "tenant_id" src/services/AuthService.js || echo "OK — no tenant_id"

# Verify tenant header inject
grep -A5 "X-Tenant-Slug" src/boot/axios.js
Fill output after running.

Completion
Setelah audit selesai:

Update FRONTEND_STATE.md

Post findings di section ini

Tunggu konfirmasi sebelum mulai implementasi
```
