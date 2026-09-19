# AI Collaboration Docs

**Purpose:** Shared memory antara AI Implementasi #1 (Backend Owner) dan AI Implementasi #2 (Frontend Owner).

**Bukan pengganti source code.** Source code tetap jadi sumber verifikasi aktual.  
**Jika dokumentasi ≠ source code → source code menang.**

---

## Struktur

| File                         | Owner | Fungsi                                       |
| ---------------------------- | ----- | -------------------------------------------- |
| `README.md`                  | —     | Index & how-to-use (file ini)                |
| `ARCHITECTURE_BASELINE.md`   | AI #1 | Arsitektur final yang disepakati             |
| `PROJECT_STATE.md`           | AI #1 | Snapshot status terkini (update berkala)     |
| `DECISIONS.md`               | AI #1 | Log keputusan arsitektur penting             |
| `BACKEND_CONTRACT.md`        | AI #1 | API contract (dari kode aktual)              |
| `BACKEND_CHANGELOG.md`       | AI #1 | Perubahan backend yang berdampak ke frontend |
| `BACKEND_GAPS.md`            | AI #1 | TODO/known limitation backend                |
| `FRONTEND_HANDOFF.md`        | AI #1 | Instruksi khusus untuk AI #2                 |
| `FRONTEND_STATE.md`          | AI #2 | Snapshot status frontend                     |
| `FRONTEND_CHANGELOG.md`      | AI #2 | Perubahan frontend                           |
| `FRONTEND_AUDIT_REPORT.md`   | AI #2 | Hasil audit frontend vs backend              |
| `FRONTEND_CHANGE_REQUEST.md` | AI #2 | Request backend changes dari frontend        |

---

## Role

**AI #1 — Backend Owner:**

- Go, Fiber, SQLite, Redis, JWT, multi-tenant
- Handlers, usecases, repositories, workers
- Security, testing, deployment
- **Tidak menyentuh frontend code**

**AI #2 — Frontend Owner:**

- Quasar, Vue 3, Pinia, Axios
- Pages, components, stores, services
- API integration, auth UI, RBAC presentation
- **Tidak menyentuh backend code**

---

## Protokol Komunikasi

**Via docs, bukan chat langsung.**
AI #1 writes:
→ BACKEND_CONTRACT.md
→ BACKEND_CHANGELOG.md
→ FRONTEND_HANDOFF.md

AI #2 reads those, then writes:
→ FRONTEND_STATE.md
→ FRONTEND_CHANGELOG.md
→ FRONTEND_AUDIT_REPORT.md
→ FRONTEND_CHANGE_REQUEST.md (jika butuh backend)

AI #1 reads change request, fixes backend, updates changelog



---

## Format Entry Changelog

```markdown
### [DATE] [SCOPE] [IMPACT]

**Changed:** ...
**Old:** ...
**New:** ...
**Frontend Action:** ...
**Status:** ✅ Applied / 🟡 In Progress / 🔴 Blocked
Impact levels: NONE / LOW / MEDIUM / HIGH / BLOCKER

Git Commit Convention

[backend] feat: ...
[backend] fix: ...
[backend] docs(ai): update BACKEND_CONTRACT.md
[frontend] feat: ...
[frontend] fix: ...
[frontend] docs(ai): update FRONTEND_STATE.md
Prefix [backend] / [frontend] untuk clarity — jangan mixed commit.

Hard Rules
❌ NO BIG-BANG REWRITE — frontend existing adalah aset

❌ NO BACKEND CHANGES oleh AI #2

❌ NO FRONTEND CHANGES oleh AI #1 (kecuali docs/ai/)

❌ NO ASSUMPTIONS — verify source code

✅ AUDIT FIRST — sebelum coding

✅ CLASSIFY — FUNCTIONAL / PARTIALLY_FUNCTIONAL / OUTDATED / BROKEN / OBSOLETE

✅ UPDATE DOCS — setiap task signifikan

Status Flags
Flag Arti
✅ Applied Sudah deploy
🟡 In Progress Sedang dikerjakan
🔴 Blocked Ada dependency
⏸️ Pending Belum mulai
❌ Deprecated Tidak dipakai lagi
Quick Start — AI #2
Baca ARCHITECTURE_BASELINE.md — pahami arsitektur

Baca PROJECT_STATE.md — snapshot status terkini

Baca BACKEND_CONTRACT.md — endpoint & payload

Baca FRONTEND_HANDOFF.md — instruksi khusus

Audit frontend existing

Klasifikasi: FUNCTIONAL / PARTIALLY_FUNCTIONAL / OUTDATED / BROKEN / OBSOLETE

Fix per prioritas

Update FRONTEND_STATE.md + FRONTEND_CHANGELOG.md

Last Updated
2026-09-18 — initial creation (Batch 1)
```
