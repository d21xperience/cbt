# Backend API Contract

**Last Updated:** 2026-09-18  
**Verified Against:** Source code Phase 3A  
**⚠️ Source code is authority.** Jika doc ≠ source, source menang.

---

## Convention

**Base URL:** `/api/v1/cbt`

**Headers:**
Content-Type: application/json
Authorization: Bearer {JWT} (untuk endpoint authenticated)
X-Tenant-Slug: {subdomain} (dev only — production pakai subdomain)



**Response envelope:**

```json
// Success
{ "status": "ok", "data": ... }

// Error
{ "error": "error_code", "message": "...", "request_id": "uuid" }
HTTP Status:

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

429 Rate Limited

500 Internal Error

1. Health
GET /health
Auth: None
Scope: Public

Response 200:

json
{ "service": "CBT Engine", "status": "OK" }
2. Platform Scope
GET /api/v1/cbt/super/schools
Auth: None
Scope: Platform

Response 200:

json
{
  "status": "ok",
  "data": [
    {
      "slug": "default",
      "name": "Default Tenant",
      "npsn": "20254180",
      "logo_url": "",
      "is_active": true,
      "portal_url": "/auth/participant"
    }
  ]
}
GET /api/v1/cbt/super/schools/:slug/config
Auth: None
Scope: Platform

Response 200: { slug, school_name, logo_url, is_suspended }

POST /api/v1/cbt/auth/super/login
Auth: None
Scope: Platform

Request:

json
{
  "username": "superadmin",
  "password": "..."
}
Response 200:

json
{
  "token": "eyJ...",
  "role": "SUPER_ADMIN",
  "user": {
    "id": "uuid",
    "username": "superadmin",
    "role": "SUPER_ADMIN"
  }
}
Rate limit: 5/15 min per IP

3. Tenant Auth
POST /api/v1/cbt/auth/admin/login
Auth: None
Scope: Tenant (WAJIB)
Tenant: Server-resolved dari subdomain/X-Tenant-Slug

Request:

json
{
  "username": "admin",
  "password": "..."
}
⚠️ TIDAK ada tenant_id di body — dihapus di Phase 3A.

Response 200:

json
{
  "token": "eyJ...",
  "role": "ADMIN",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "ADMIN",
    "tenant_id": "feb2b5b1-4895-4b46-a7ad-058c89e9a117"
  }
}
JWT payload:

json
{
  "uid": "admin-uuid",
  "role": "ADMIN",
  "tenant_id": "feb2b5b1-...",
  "iss": "cbt-engine",
  "exp": 1789772705,
  "iat": 1789729505
}
Errors:

400 tenant_not_resolved — subdomain invalid

400 username/password wajib

401 credential salah

403 role tidak diizinkan (bukan ADMIN/SUPER_ADMIN)

429 rate limited

POST /api/v1/cbt/auth/proctor/login
Auth: None
Scope: Tenant

Request:

json
{
  "username": "guru1",
  "password": "..."
}
Response 200: { token, role: "PROCTOR"|"TEACHER", user: {...} }

Rate limit: 5/15 min

POST /api/v1/cbt/auth/exam/login
Auth: None
Scope: Tenant

Request:

json
{
  "username": "12345678",   // NISN
  "password": "ABC123"       // dari kartu ujian (6 char)
}
Response 200:

json
{
  "status": "authorized",
  "role": "PARTICIPANT",
  "token": "eyJ...",         // JWT-A (belum ada exam_id)
  "user": {
    "participant_id": "participant-uuid",
    "nisn": "12345678",
    "name": "Budi Santoso",
    "rombel": "XII-1"
  },
  "eligible_exams": ["test-exam-1"]
}
JWT-A payload:

json
{
  "uid": "participant-uuid",
  "role": "PARTICIPANT",
  "iss": "cbt-engine",
  "exp": ...,
  "iat": ...
}
Rate limit: 5/15 min

4. Admin Endpoints
⚠️ Semua endpoint di bawah ini butuh:

Authorization: Bearer {JWT} — role ADMIN atau SUPER_ADMIN

Tenant con (subdomain/X-Tenant-Slug)

GET /api/v1/cbt/admin/dashboard/stats
Response 200:

json
{
  "total_exams": 1,
  "total_participants": 100,
  "active_sessions": 0,
  "completed_exams": 5
}
⚠️ Catatan: Field total_questions belum ada — perlu ditambah (lihat BACKEND_GAPS).

POST /api/v1/cbt/admin/sync
Request:

json
{
  "pembelajaran_id": "...",
  "semester_id": "..."
}
Response 200:

json
{
  "message": "Sinkronisasi berhasil",
  "synced_count": 100
}
Dependency: SIAKAD_BASE_URL env + Cloudflare Tunnel aktif.

POST /api/v1/cbt/admin/session
Request:

json
{
  "exam_id": "test-exam-1",
  "semester_id": "20261",
  "session_type": "REGULER",
  "start_time": "2026-09-20T08:00:00+07:00",
  "end_time": "2026-09-20T10:00:00+07:00"
}
Response 201:

json
{
  "message": "Sesi ujian berhasil dibuat",
  "session": { "id": "uuid", "exam_id": "...", "status": "SCHEDULED", ... }
}
GET /api/v1/cbt/admin/sessions
Query:

exam_id (optional)

active_only (true/false)

Response 200:

json
{
  "status": "ok",
  "data": [{
    "id": "session-uuid",
    "exam_id": "test-exam-1",
    "exam_title": "Ujian Test",
    "session_type": "REGULER",
    "start_time": "2026-09-20T08:00:00Z",
    "end_time": "2026-09-20T10:00:00Z",
    "status": "SCHEDULED",
    "has_active_token": true
  }],
  "count": 1
}
GET /api/v1/cbt/admin/sessions/:sessionId/token
Response 200:

json
{
  "token": "AB3XYZ",
  "valid_from": "2026-09-20T08:00:00Z",
  "valid_until": "2026-09-20T08:30:00Z",
  "remaining_seconds": 1742
}
POST /api/v1/cbt/admin/sessions/:sessionId/token/rotate
Response 200: { id, session_id, token, valid_from, valid_until, is_active }

POST /api/v1/cbt/admin/archive
Request:

json
{
  "school_id": "default",
  "semester_id": "20261",
  "is_end_of_academic_year": false
}
Response 200:

json
{
  "message": "Archive & reset berhasil",
  "tenant_id": "default"
}
⚠️ DESTRUCTIVE: Hapus data transaksional. Hanya untuk admin.

POST /api/v1/cbt/admin/credentials/generate
Request:

json
{
  "exam_id": "test-exam-1",
  "valid_days": 0,
  "overwrite": false
}
Response 200:

json
{
  "status": "ok",
  "count": 100,
  "data": [
    { "nisn": "12345678", "username": "12345678", "password": "ABC123", ... }
  ]
}
⚠️ Password plain hanya di response ini. Tidak disimpan di log.

GET /api/v1/cbt/admin/credentials/view?exam_id=...
Response 200: { status, data: [{ nisn, username, password, is_active, ... }] }

GET /api/v1/cbt/admin/proctors
Response 200:

json
{
  "status": "ok",
  "data": [
    { "id": "uuid", "username": "guru1", "role": "PROCTOR", "tenant_id": "default" }
  ]
}
POST /api/v1/cbt/admin/proctors/assign
Request:

json
{
  "proctor_id": "uuid",
  "session_id": "uuid",
  "class_name": "XII-1"
}
Response 200: { status: "ok", message: "Proctor berhasil di-assign" }

POST /api/v1/cbt/admin/payments/block
Request:

json
{
  "nisn": "12345678",
  "reason": "Tunggakan SPP 2 bulan",
  "note": "opsional"
}
Response 200: { status: "ok", message: "Siswa diblokir" }

POST /api/v1/cbt/admin/payments/unblock
Request: { nisn, note }

Response 200: { status: "ok", message: "Siswa di-unblock" }

GET /api/v1/cbt/admin/payments/blocked
Response 200: { status, data: [{ nisn, is_blocked, reason, blocked_by, blocked_at, ... }], count }

POST /api/v1/cbt/admin/makeup/approve
Request:

json
{
  "participant_id": "uuid",
  "session_id": "uuid",
  "reason": "Sakit"
}
Response 200: { status: "ok", message: "Peserta diizinkan ikut susulan" }

GET /api/v1/cbt/admin/questions/template
Response: Binary XLSX file

POST /api/v1/cbt/admin/participants/import-external
Request: multipart/form-data

csv_file (file)

exam_id, semester_id, school_name (form values)

Response 200:

json
{
  "message": "Import peserta eksternal berhasil",
  "imported_count": 50
}
5. Proctor Endpoints
Auth: Authorization: Bearer {JWT} — role ADMIN, PROCTOR, TEACHER

GET /api/v1/cbt/proctor/sessions
Response 200:

json
{
  "status": "ok",
  "data": [{
    "session_id": "uuid",
    "exam_id": "test-exam-1",
    "exam_title": "Ujian Test",
    "session_type": "REGULER",
    "start_time": "...",
    "end_time": "...",
    "status": "SCHEDULED",
    "student_count": 30
  }],
  "count": 1
}
POST /api/v1/cbt/proctor/unlock
Request:

json
{
  "exam_id": "test-exam-1",
  "participant_id": "uuid"
}
Response 200: { status: "ok", message: "Peserta berhasil di-unlock" }

Permission: Proctor hanya bisa unlock untuk sesi yang dia awasi.

6. Exam Endpoints (Participant)
Auth: Authorization: Bearer {JWT} — role PARTICIPANT
Scope: Tenant

GET /api/v1/cbt/exam/dashboard
Response 200:

json
{
  "status": "ok",
  "data": {
    "scheduled": [
      {
        "exam_id": "test-exam-1",
        "session_id": "uuid",
        "title": "Ujian Test",
        "session_type": "REGULER",
        "start_time": "...",
        "end_time": "...",
        "session_status": "ACTIVE",
        "is_makeup": false,
        "blocked": false,
        "blocked_reason": ""
      }
    ],
    "makeup_available": [],
    "completed": []
  }
}
GET /api/v1/cbt/exam/active
Response 200: { status: "ok", data: [...] } — daftar exam eligible

GET /api/v1/cbt/exam/history
Response 200: { status: "ok", data: [...] } — riwayat ujian

GET /api/v1/cbt/exam/timer
Response 200:

json
{
  "status": "ACTIVE",
  "remaining_seconds": 3077,
  "server_time": 1789409813,
  "session_id": "sess-uuid"
}
POST /api/v1/cbt/exam/:examId/verify-token
Request:

json
{ "token": "AB3XYZ" }
Response 200:

json
{
  "valid": true,
  "token": "eyJ...",         // JWT-B (dengan exam_id)
  "session_id": "sess-uuid",
  "exam_id": "test-exam-1",
  "message": "Token terverifikasi"
}
JWT-B payload: { uid, role: "PARTICIPANT", exam_id: "test-exam-1", iss, exp, iat }

POST /api/v1/cbt/exam/start
Auth: JWT-B (dengan exam_id)

Response 200:

json
{
  "status": "exam_started",
  "questions": [
    {
      "id": "q1",
      "exam_id": "test-exam-1",
      "question_": "...",
      "options": "{\"A\":\"...\",\"B\":\"...\"}",
      "question_type": "PG",
      "score": 10
      // ⚠️ correct_option TIDAK dikirim
    }
  ]
}
POST /api/v1/cbt/exam/answer
Request: { question_id, answer }

Response 200: { status: "answer_saved" }

POST /api/v1/cbt/exam/answers/batch
Request:

json
{
  "idempotency_key": "client-xxx",
  "answers": [
    { "question_id": "q1", "answer": "A" },
    { "question_id": "q2", "answer": "B" }
  ]
}
Response 200:

json
{ "status": "accepted", "accepted": 2 }
POST /api/v1/cbt/exam/submit
Request: (no body)

Response 200:

json
{
  "status": "exam_completed",
  "participant_id": "uuid",
  "total_questions": 3,
  "correct_answers": 2,
  "final_score": 100.0
}
POST /api/v1/cbt/exam/heartbeat
Response 200: { status: "alive" }

POST /api/v1/cbt/exam/telemetry
Request: { event_type: "tab_switch" }

Response 200: { status: "recorded", action: "NONE"|"WARN"|"FORCE_SUBMIT", event }

7. Endpoint Belum Ada
Endpoint	Target Phase
/api/v1/cbt/admin/participants	Phase 6 (D4)
/api/v1/cbt/admin/participants/import-excel	Phase 6
/api/v1/cbt/admin/participants/:id	Phase 6
8. Rate Limits
Endpoint	Limit
/auth/*/login	5 / 15 min (Go) + 1 r/s (nginx)
/exam/answers/batch	60 / min
/exam/submit	5 / min
Others	200 / min
Load test bypass: header X-Load-Test-Token (production: disabled)

9. Versioning
Current: v1
Path: /api/v1/cbt/*

Perubahan breaking akan naik ke /api/v2/* (belum direncanakan).

10. [VERIFY] Checklist
Untuk memastikan doc ini akurat, AI #1 harus verify:

□ internal/cbt/delivery/http/handler.go — semua signature method match
□ internal/app/routes.go — semua route match
□ internal/middleware/auth.go — JWT claims match
□ internal/platform/domain/tenant.go — tenant shape match
□ internal/scheduling/domain/participant.go — participant shape match
Kalau ada mismatch, update doc ini.
```
