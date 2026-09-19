# Frontend State

**Owner:** AI Implementasi #2 (Frontend Owner)  
**Last Updated:** `YYYY-MM-DD` (update setiap sesi)  
**Status:** `AUDIT_PENDING` / `IN_PROGRESS` / `STABLE`

---

## ⚠️ Instructions

File ini **di-maintain oleh AI #2**. Update setelah setiap sesi kerja signifikan.

Format entry: `YYYY-MM-DD` + ringkasan singkat + status.

---

## 1. Current Snapshot

| Metric | Value |
|--------|-------|
| Quasar Version | `v2.x` |
| Vue Version | `v3.x` |
| Build Status | `[PASS / FAIL]` |
| Lint Status | `[PASS / FAIL]` |
| Active Development | `[YES / NO]` |
| Deployed | `[YES / NO]` |

---

## 2. Frontend Modules Status

Klasifikasi per modul:

| Status | Arti |
|--------|------|
| `FUNCTIONAL` | Bekerja end-to-end, tidak butuh perubahan |
| `PARTIALLY_FUNCTIONAL` | Bekerja tapi ada bagian incomplete |
| `OUTDATED` | Kontrak dengan backend tidak sinkron |
| `BROKEN` | Tidak bekerja |
| `OBSOLETE` | Sudah tidak dipakai |
| `UNKNOWN` | Belum di-audit |

### Pages

| Page | Path | Status | Notes |
|------|------|--------|-------|
| Admin Dashboard | `pages/admin/Dashboard.vue` | `UNKNOWN` | |
| Admin Participants | `pages/admin/Participants.vue` | `UNKNOWN` | Endpoint belum ada |
| Admin Questions | `pages/admin/Questions.vue` | `UNKNOWN` | |
| Admin Sessions | `pages/admin/Sessions.vue` | `UNKNOWN` | |
| Admin Archive | `pages/admin/Archive.vue` | `UNKNOWN` | |
| Admin ExamCard | `pages/admin/ExamCardManagement.vue` | `UNKNOWN` | |
| Admin User Management | `pages/admin/UserManagement.vue` | `UNKNOWN` | |
| Admin Sync Siakad | `pages/admin/SyncSiakad.vue` | `UNKNOWN` | |
| Admin Token Display | `pages/admin/TokenDisplay.vue` | `UNKNOWN` | |
| Auth Admin Login | `pages/auth/AdminLogin.vue` | `UNKNOWN` | |
| Auth Participant Login | `pages/auth/ParticipantLogin.vue` | `UNKNOWN` | |
| Auth Super Admin Login | `pages/auth/SuperAdminLogin.vue` | `UNKNOWN` | |
| Auth Teacher Login | `pages/auth/TeacherLogin.vue` | `UNKNOWN` | |
| Exam Dashboard | `pages/exam/ExamDashboard.vue` | `UNKNOWN` | |
| Exam History | `pages/exam/ExamHistory.vue` | `UNKNOWN` | |
| Exam Room | `pages/exam/ExamRoom.vue` | `UNKNOWN` | |
| Exam Schedule | `pages/exam/ExamSchedule.vue` | `UNKNOWN` | |
| Exam User Profile | `pages/exam/ExamUserProfile.vue` | `UNKNOWN` | |
| Exam Waiting Room | `pages/exam/WaitingRoom.vue` | `UNKNOWN` | |
| Exam Preparation | `pages/exam/Preparation.vue` | `UNKNOWN` | |
| Super Dashboard | `pages/super/SuperDashboard.vue` | `UNKNOWN` | |
| Super Schools | `pages/super/SchoolsManagement.vue` | `UNKNOWN` | |
| Super Billing | `pages/super/BillingManagement.vue` | `UNKNOWN` | |
| Super Telemetry | `pages/super/TelemetryLogs.vue` | `UNKNOWN` | |
| Landing Page | `pages/LandingPage.vue` | `UNKNOWN` | |

### Stores (Pinia)

| Store | Path | Status |
|-------|------|--------|
| auth | `stores/auth.js` | `UNKNOWN` |
| theme | `stores/theme.js` | `UNKNOWN` |
| examActive | `stores/exam/examActive.js` | `UNKNOWN` |
| examPreparation | `stores/exam/examPreparation.js` | `UNKNOWN` |
| examSchedule | `stores/exam/examSchedule.js` | `UNKNOWN` |
| examWaitingRoom | `stores/exam/examWaitingRoom.js` | `UNKNOWN` |
| questions | `stores/exam/questions.js` | `UNKNOWN` |
| adminDashboard | `stores/admin/dashboard.js` | `UNKNOWN` |
| adminQuestions | `stores/admin/questions.js` | `UNKNOWN` |
| adminUsers | `stores/admin/users.js` | `UNKNOWN` |
| superTenant | `stores/super/superTenant.js` | `UNKNOWN` |
| superBilling | `stores/super/superBilling.js` | `UNKNOWN` |

### Services (Axios)

| Service | Path | Status |
|---------|------|--------|
| AuthService | `services/AuthService.js` | `UNKNOWN` |
| ActiveExamService | `services/exam/ActiveExamService.js` | `UNKNOWN` |
| ScheduleService | `services/exam/ScheduleService.js` | `UNKNOWN` |
| DashboardService | `services/admin/DashboardService.js` | `UNKNOWN` |
| QuestionService | `services/admin/QuestionService.js` | `UNKNOWN` |
| UserService | `services/admin/UserService.js` | `UNKNOWN` |
| TenantService | `services/super/TenantService.js` | `UNKNOWN` |
| BillingService | `services/super/BillingService.js` | `UNKNOWN` |

### Composables

| Composable | Path | Status |
|------------|------|--------|
| useTenant | `composables/super/useTenant.js` | `UNKNOWN` |
| useExamList | `composables/exam/useExamList.js` | `UNKNOWN` |
| usePreparation | `composables/exam/usePreparation.js` | `UNKNOWN` |
| useCacheManager | `composables/exam/useCacheManager.js` | `UNKNOWN` |
| useAssetDownloader | `composables/exam/useAssetDownloader.js` | `UNKNOWN` |

### Mocks

⚠️ **Mock harus TIDAK aktif di production.**

| Mock File | Status | Should be disabled in prod? |
|-----------|--------|------------------------------|
| `mocks/mockInterceptor.js` | `UNKNOWN` | YES |
| `mocks/handlers/*.js` | `UNKNOWN` | YES |
| `mocks/data/*.js` | `UNKNOWN` | YES |

**Verify:** `QCLI_MOCK_MODE` harus `false` di production build.

---

## 3. Environment Variables

**Frontend `.env` files:**

`.env` (shared):
QCLI_API_BASE_URL=/api/v1/cbt



`.env.production`:
QCLI_MOCK_MODE=false
QCLI_API_BASE_URL=/api/v1/cbt



**Verify:**
```bash
grep -r "QCLI_MOCK_MODE\|QCLI_API_BASE_URL" .env* src/boot/axios.js
4. Known Issues
#	Issue	Severity	Status
1	...	LOW/MED/HIGH	OPEN/FIXED
(Update sesuai temuan audit)

5. Changelog (refer to FRONTEND_CHANGELOG.md)
Detail perubahan ada di FRONTEND_CHANGELOG.md.

6. Session Log
YYYY-MM-DD — Initial audit
Task: Setup, baca docs/ai/, mulai audit

Files read: ARCHITECTURE_BASELINE.md, BACKEND_CONTRACT.md, FRONTEND_HANDOFF.md

Files changed: none

Next: Complete audit report

Update Instructions
Setiap sesi:

Update "Last Updated"

Update "Current Snapshot"

Update table status per modul (yang sudah di-audit)

Append "Session Log"