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

```markdown
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