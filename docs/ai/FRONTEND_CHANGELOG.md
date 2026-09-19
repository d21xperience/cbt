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
