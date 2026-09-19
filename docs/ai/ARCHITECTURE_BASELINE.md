# Architecture Baseline

**Status:** `ACTIVE`  
**Last Updated:** 2026-09-18  
**Verified Against:** Backend source code Phase 3A

---

## 1. Platform Structure

┌─────────────────────────────────────────────┐
│ PLATFORM │
│ ujian.pw │
│ │
│ ┌──────────────────────────────────────┐ │
│ │ Platform DB (platform.db) │ │
│ │ - tenants registry │ │
│ │ - platform_users (SUPER_ADMIN) │ │
│ │ - subscriptions │ │
│ │ - platform_audit_log │ │
│ └──────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────┐ │
│ │ Tenant A (smkjaya.ujian.pw) │ │
│ │ └── Tenant DB A (cbt.db) │ │
│ │ - admins, proctors │ │
│ │ - participants │ │
│ │ - exams, sessions, questions │ │
│ │ - results, proctoring │ │
│ └──────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────┐ │
│ │ Tenant B (smkpasja.ujian.pw) │ │
│ │ └── Tenant DB B (cbt.db) │ │
│ └──────────────────────────────────────┘ │
└─────────────────────────────────────────────┘



**Prinsip:** **1 Tenant = 1 SQLite Database**  
**Tujuan:** Tenant isolation, backup per sekolah, restore per sekolah.

---

## 2. Identity Layers

| Layer          | Contoh                                        | Fungsi                            |
| -------------- | --------------------------------------------- | --------------------------------- |
| **NPSN**       | `20254180`                                    | Global business identity (unique) |
| **tenant_id**  | `feb2b5b1-4895-4b46-a7ad-058c89e9a117` (UUID) | Internal system identity          |
| **subdomain**  | `default`, `smkjaya`                          | Access address (URL)              |
| **tenant_key** | `default` (subdomain value)                   | Lookup key di tenant DB           |

**Note:**

- JWT menyimpan **UUID** sebagai `tenant_id`
- Tenant DB menyimpan **subdomain** sebagai `tenant_id` (dari phase awal)
- Factory routing pakai **UUID** untuk file path, **subdomain** untuk DB query

---

## 3. RBAC (Role-Based Access Control)

SUPER_ADMIN
↓
Platform scope (ujian.pw)
Platform DB
Kelola tenants, subscriptions, billing

ADMIN (sekolah)
↓
Tenant scope (smkjaya.ujian.pw)
Tenant DB sekolah tersebut
Kelola ujian, peserta, sesi, soal, proktor

PROCTOR / TEACHER
↓
Tenant scope, exam-scoped
Awasi kelas, unlock peserta (max 3x)

PARTICIPANT
↓
Self scope
Ikut ujian, jawab soal, submit



**JWT claims:**

```json
{
  "uid": "user-uuid",
  "role": "ADMIN|SUPER_ADMIN|PROCTOR|TEACHER|PARTICIPANT",
  "tenant_id": "tenant-uuid",   // omit untuk SUPER_ADMIN
  "exam_id": "exam-uuid",       // hanya untuk PARTICIPANT dengan JWT-B
  "exp": 1234567890,
  "iat": 1234567890,
  "iss": "cbt-engine"
}
4. Database Layout
Disk:


/var/lib/cbt/
├── platform/
│   └── platform.db              # registry, super admin
└── tenants/
    └── {tenant-uuid}/
        └── cbt.db               # semua data tenant
Tenant DB tables (11 dengan tenant_id):


admins                    — admin sekolah + proctor + teacher
exam_results              — hasil ujian
exam_sessions             — sesi ujian (REGULER/SUSULAN)
participant_sessions      — mapping peserta-sesi + attendance
eligible_participants     — daftar peserta ujian (SIAKAD + EXTERNAL)
questions                 — bank soal
exams                     — metadata ujian
participant_credentials   — login peserta (username+password encrypted)
payment_gates             — blokir siswa (SPP)
exam_tokens               — token rotating proctor
proctor_assignments       — mapping proctor ↔ sesi
Platform DB tables:


tenants                   — registry tenant
platform_users            — super admin
subscriptions             — billing
platform_audit_log        — audit platform
5. Backend Architecture

Frontend (Static SPA via Nginx)
       ↓
       │ HTTPS
       ▼
   [Nginx :443]
       │
       ├── Static assets  → /var/www/cbt/frontend
       │
       └── /api/*         → proxy_pass :8082
              ↓
       [Go + Fiber :8082]
              ↓
       Middleware stack:
       1. RequestID
       2. Recover
       3. SecurityHeaders
       4. RequestLogger
       5. TenantResolver (OPTIONAL — tidak fail kalau tidak ada tenant)
       6. CORS
              ↓
       Route scope:
       ├─ PLATFORM: /super/*, /auth/super/login
       └─ TENANT:   /auth/{admin,exam,proctor}/login,
                    /admin/*, /proctor/*, /exam/*
              ↓
       Handler → Factory → Usecase → Repository → SQLite / Redis
6. Code Structure (Backend)

backend/
├── cmd/
│   ├── server/main.go              # 8 baris — entry point
│   ├── seed/main.go                # seed admin
│   ├── seed-proctor/main.go        # seed proctor
│   ├── seed-credentials/main.go    # seed credentials peserta
│   └── migrate-tenants/main.go     # CLI migrasi single → multi tenant
│
└── internal/
    ├── app/                        # Modular orchestrator
    │   ├── app.go                  # Run()
    │   ├── infra.go                # InitInfra + Close
    │   ├── fiber_setup.go          # Fiber config + global middleware + CORS
    │   ├── routes.go               # Scope-separated route registration
    │   ├── worker.go               # Background workers (Phase 3A: disabled)
    │   └── server.go               # Start + graceful shutdown
    │
    ├── tenant/                     # Multi-tenant infra (Phase 3A)
    │   ├── manager.go              # TenantDBManager (LRU cache, lazy open)
    │   ├── con.go              # Go con helpers
    │   ├── factory.go              # Per-request usecase builder
    │   ├── redis_keys.go           # Namespace helper
    │   └── con_test.go         # Unit tests
    │
    ├── middleware/
    │   ├── auth.go                 # JWTAuth, RequireRole
    │   ├── tenant_resolver.go      # Resolve tenant dari subdomain
    │   ├── scope.go                # RequireTenant middleware
    │   ├── ratelimit.go            # Rate limits
    │   ├── recover.go              # Panic recovery
    │   ├── requestid.go            # Request ID
    │   ├── logger.go               # Request logger
    │   ├── security_headers.go     # Security headers
    │   └── validate.go             # Input validation
    │
    ├── platform/                   # Platform scope (Phase 1)
    │   ├── domain/tenant.go
    │   ├── repository/tenant_db.go
    │   ├── repository/platform_user_db.go
    │   └── usecase/tenant_uc.go
    │
    ├── cbt/                        # CBT domain
    │   ├── domain/                 # Entities
    │   ├── delivery/http/handler.go # HTTP handlers (~1500 baris)
    │   ├── repository/
    │   │   ├── interfaces.go
    │   │   ├── sqlite/             # SQLite repos
    │   │   └── redis/              # Redis cache (tenant-namespaced)
    │   └── usecase/                # Business logic
    │
    ├── scheduling/                 # SIAKAD sync, participant, admin
    ├── proctoring/                 # Proctoring events, heartbeat
    ├── grading/                    # Essay grading queue
    ├── archive/                    # Semester archive
    └── crypto/                     # AES-GCM for credentials
7. Redis Namespace (Phase 3A)
Format: tenant:{tenant-uuid}:{domain}:{...}

Contoh keys:


tenant:feb2b5b1-...:exam:answers:{examID}:{participantID}
tenant:feb2b5b1-...:exam:status:{examID}:{participantID}
tenant:feb2b5b1-...:heartbeat:{examID}:{participantID}
tenant:feb2b5b1-...:proctoring:warnings:{examID}:{participantID}
tenant:feb2b5b1-...:proctoring:lock_level:{examID}:{participantID}
tenant:feb2b5b1-...:banned:{examID}:{participantID}
tenant:feb2b5b1-...:queue:essay_grading
Hard rule:

❌ NO FlushAll() — hanya delete dengan prefix tenant:{id}:

✅ Semua key WAJIB pakai namespace tenant

✅ TTL default: 12 jam (kecuali heartbeat: 30 detik)

8. Frontend Architecture (Existing)

frontend/
├── src/
│   ├── boot/axios.js               # HTTP client + tenant header injection
│   ├── router/index.js             # Route guard (RBAC)
│   ├── routes.js                   # Route definitions
│   ├── layouts/                    # AdminLayout, StudentLayout, dll
│   ├── pages/                      # admin/, exam/, auth/, super/
│   ├── components/                 # Reusable components
│   ├── composables/                # useTenant, useExamList, dll
│   ├── stores/                     # Pinia stores
│   ├── services/                   # Axios wrappers
│   ├── utils/                      # tenant.js, proctoring.js, dll
│   └── mocks/                      # Mock data (dev only)
└── dist/spa/                       # Build output
Deployment: Static build → /var/www/cbt/frontend/ → served by Nginx

9. Request Flow (Contoh: Admin Login)

1. User buka https://default.ujian.pw/#/auth/admin
2. Frontend: POST /api/v1/cbt/auth/admin/login
   Body: { username, password }  ← TIDAK ada tenant_id
   Header: X-Tenant-Slug: default (auto-inject oleh axios)
                    ↓
3. Nginx: proxy → 127.0.0.1:8082
                    ↓
4. Fiber middleware stack
   - TenantResolver:
     - extract subdomain dari Host atau X-Tenant-Slug
     - resolve via platform DB → UUID + DB path
     - set Go con (tenant.WithTenantInfo)
                    ↓
5. Route: /api/v1/cbt/auth/admin/login
   - RequireTenant() → cek tenant con ada
                    ↓
6. Handler: HandleAdminLogin
   - info := tenant.FromCon(ctx)
   - uc := factory.Usecases(ctx)  ← tenant-scoped
   - uc.AdminLoginUC.Login(ctx, info.Subdomain, username, password)
                    ↓
7. Usecase → Repository → SQLite (tenant DB)
   - SELECT * FROM admins WHERE tenant_id='default' AND username=?
                    ↓
8. bcrypt verify password
                    ↓
9. Generate JWT (uid=adminUUID, role=ADMIN, tenant_id=UUID)
                    ↓
10. Response: { token, role, user: { id, username, role, tenant_id } }
10. Deployment Target

Server: Debian 12
CPU:    2 cores
RAM:    2 GB
Disk:   30 GB

Services:
- Nginx (reverse proxy + static)
- Go binary (systemd: cbt-backend)
- SQLite (platform + per-tenant)
- Redis (localhost:6379)
- Let's Encrypt (auto-renew)

Backup:
- Daily cron: /etc/cron.daily/cbt-backup
- Retention: 30 days
- Location: /var/backups/cbt/

Monitoring:
- journalctl -u cbt-backend
- /var/log/nginx/cbt.error.log
- /var/log/cbt/backend.log
11. Yang Sudah Selesai (per 2026-09-18)
✅ Auth:

Admin login (username+password, tenant-scoped)

Super admin login (platform DB)

Proctor login

Peserta login (username+password encrypted dengan AES-GCM)

JWT generation + validation

Password hashing (bcrypt)

✅ Multi-tenant infrastructure:

Platform DB + registry

Tenant DB manager (lazy open, LRU cache)

Tenant resolver middleware

Route scope separation

Redis namespace

✅ Modular app:

Entry point minimal (cmd/server/main.go)

Orkestrasi di internal/app/

Test coverage untuk tenant con

✅ Security:

Rate limiting (nginx + Go)

Security headers (HSTS, X-Frame, CSP, dll)

Panic recovery

Request ID

Input validation

CORS strict

Tenant isolation

✅ Load test (P14):

1000 concurrent user proven

p95 latency 104ms

0% error rate

12. Yang Sedang Dikerjakan
🟡 Phase 3B — Handler Migration:

57 handler method belum migrate ke factory pattern

Masih pakai legacy struct fields (h.examUC, dll)

Tidak blocking untuk 1 tenant, WAJIB untuk multi-tenant

🟡 Workers (temporarily disabled):

Token Rotator — butuh tenant-aware iteration

Attendance Worker — idem

Akan diaktifkan di Phase 3B/3D

13. Yang Belum Dikerjakan
🔴 Phase 3C: Cleanup + full isolation test suite
🔴 Phase 4: Exam lifecycle (DRAFT..PURGED)
🔴 Phase 5: Backup multi-tenant
🔴 Phase 6: D4 Participant Management (Excel import)
🔴 Phase 7: Proctoring dashboard real-time

Changelog
Date	Change
2026-09-18	Initial baseline (Phase 3A closed)
```
