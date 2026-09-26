// src/mocks/handlers/superAdminHandlers.js
import {
  mockSuperDashboardStats,
  mockSuperDashboardLogs,
  mockSchoolTenant,
} from '../data/superadminData'
import { mockPendingSchools, cloneMock } from '../data/onboardingData'
import { mockTelemetryLogs } from '../data/telemetryData'
const DELAY = 300

// ── In-memory state untuk pending/approve/reject (per modul lifecycle)
let pendingSchools = cloneMock(mockPendingSchools)

// Reset helper — dipakai mockInterceptor.js untuk expose ke window
export const resetOnboardingMockData = () => {
  pendingSchools = cloneMock(mockPendingSchools)
}

export const superAdminHandlers = (mock) => {
  // ── EXISTING (jangan diubah)
  mock.onGet('/super/dashboard/stats').reply(() => {
    return [200, mockSuperDashboardStats, { delay: DELAY }]
  })

  mock.onGet('/super/dashboard/logs').reply(() => {
    return [200, mockSuperDashboardLogs, { delay: DELAY }]
    // return [200, { status: 'ok', data: {} }, { delay: DELAY }]
  })
  // ── GET /super/telemetry/logs — VER-011 pending
  mock.onGet('/super/telemetry/logs').reply(() => {
    // return [404, { error: 'not_found' }, { delay: DELAY }]
    return [200, mockTelemetryLogs, { delay: DELAY }]
  })

  // GET /super/schools/:slug/config — read pakai SLUG (Decision 1)
  // Extend: SaaS config fields (Batch 5c) — align dengan tenant list
  mock.onGet(/\/super\/schools\/([^/]+)\/config/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/config/)
    const identifier = match ? match[1] : null

    const schoolData = mockSchoolTenant.find(
      (s) => s.slug.toLowerCase() === identifier?.toLowerCase() || s.id === identifier,
    )

    if (!schoolData) {
      return [
        404,
        {
          error: 'tenant_not_found',
          message: `Cluster sekolah '${identifier}' tidak dikenali sistem.`,
        },
        { delay: DELAY },
      ]
    }

    return [
      200,
      {
        // ── Tenant basic
        slug: schoolData.slug,
        subdomain: schoolData.subdomain || schoolData.slug,
        npsn: schoolData.npsn,
        school_name: schoolData.school_name,
        jenjang: schoolData.jenjang || 'SMA',
        program_duration_years: Number(schoolData.program_duration_years) || 3,
        logo_url: schoolData.logo_url || '',
        is_suspended: !!schoolData.is_suspended,
        is_active: !!schoolData.is_active,

        // ── SaaS config (Batch 5b/5c)
        package_tier: schoolData.package_tier || 'BASIC',
        billing_type: schoolData.billing_type || 'MONTHLY',
        max_active_students: Number(schoolData.max_participants) || 500,

        // ── SaaS specific (placeholder — VER-011 backend pending)
        domain_mode: 'SUBDOMAIN',
        custom_domain: '',
        allowed_features: {
          proctoring_ai: false,
          coding_question: false,
        },
      },
      { delay: DELAY },
    ]
  })
  // ── POST /super/schools/:identifier/config — SaaS config save (VER-011 pending)
  // Backend endpoint belum ada di VER-003. Mock intercept supaya tidak 405.
  mock.onPost(/\/super\/schools\/([^/]+)\/config/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/config/)
    const identifier = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')

    console.info('[MOCK] POST SaaS config for tenant:', identifier, body)

    const school = mockSchoolTenant.find(
      (s) => s.slug.toLowerCase() === identifier?.toLowerCase() || s.id === identifier,
    )
    if (!school) {
      return [
        404,
        { error: 'tenant_not_found', message: `Tenant '${identifier}' tidak ditemukan` },
        { delay: DELAY },
      ]
    }

    // ── Persist field yang di-edit
    if (typeof body.is_suspended === 'boolean') {
      school.is_suspended = body.is_suspended
    }
    if (body.subdomain) {
      school.slug = body.subdomain
      school.subdomain = body.subdomain
    }
    if (body.package_tier) {
      school.package_tier = body.package_tier
    }
    if (body.billing_type) {
      school.billing_type = body.billing_type
    }
    if (body.max_active_students) {
      school.max_participants = Number(body.max_active_students)
    }

    return [200, { status: 'ok', message: 'Parameter SaaS berhasil disimpan' }, { delay: DELAY }]
  })
  // ── VER-011: POST /super/schools/register — super admin direct-create
  mock.onPost('/super/schools/register').reply((config) => {
    const body = JSON.parse(config.data || '{}')

    // Validate minimal
    if (!body.npsn || !body.school_name || !body.subdomain) {
      return [
        400,
        { error: 'validation_failed', message: 'npsn, school_name, subdomain wajib' },
        { delay: DELAY },
      ]
    }
    // ── VER-011: PUT /super/schools/:tenant_id — update tenant
    mock.onPut(/\/super\/schools\/([^/]+)$/).reply((config) => {
      const match = config.url.match(/\/super\/schools\/([^/]+)$/)
      const tenantId = match ? match[1] : null
      const body = JSON.parse(config.data || '{}')

      console.info('[MOCK] PUT /super/schools/:id →', tenantId, body)

      const idx = mockSchoolTenant.findIndex((s) => s.id === tenantId)
      if (idx === -1) {
        return [404, { error: 'tenant_not_found' }, { delay: DELAY }]
      }

      // Cek subdomain unik (kalau berubah)
      if (body.subdomain) {
        const conflict = mockSchoolTenant.find(
          (s) => s.id !== tenantId && s.slug.toLowerCase() === body.subdomain.toLowerCase(),
        )
        if (conflict) {
          return [
            409,
            {
              error: 'subdomain_taken',
              message: `Subdomain '${body.subdomain}' sudah dipakai sekolah lain`,
            },
            { delay: DELAY },
          ]
        }
      }

      // Merge update (partial)
      const current = mockSchoolTenant[idx]
      mockSchoolTenant[idx] = {
        ...current,
        ...body,
        id: current.id, // protect ID
        tenant_id: current.tenant_id, // protect UUID
        slug: body.subdomain || current.slug,
        subdomain: body.subdomain || current.subdomain,
      }

      return [
        200,
        {
          status: 'ok',
          message: 'Tenant berhasil diperbarui',
          data: mockSchoolTenant[idx],
        },
        { delay: DELAY },
      ]
    })
    // Cek subdomain unik
    const exists = mockSchoolTenant.find(
      (s) => s.slug.toLowerCase() === body.subdomain.toLowerCase(),
    )
    if (exists) {
      return [
        409,
        { error: 'subdomain_taken', message: `Subdomain '${body.subdomain}' sudah dipakai` },
        { delay: DELAY },
      ]
    }

    // Generate tenant_id (UUID-like)
    const tenantId = `550e8400-e29b-41d4-a716-${Date.now().toString(16).padStart(12, '0')}`

    const newTenant = {
      id: tenantId,
      tenant_id: tenantId,
      slug: body.subdomain,
      subdomain: body.subdomain,
      npsn: body.npsn,
      school_name: body.school_name,
      logo_url: '',
      city: '',
      jenjang: body.jenjang || 'SMA',
      program_duration_years: Number(body.program_duration_years) || 3,
      contact_email: body.contact_email || '',
      contact_phone: body.contact_phone || '',
      package_tier: body.package_tier || 'BASIC', // ← BARU
      billing_type: body.billing_type || 'MONTHLY', // ← BARU
      max_participants: Number(body.max_participants) || 500,
      is_suspended: false,
      is_active: true,
      sync_locked: false,
    }

    mockSchoolTenant.push(newTenant)

    console.info('[MOCK] POST /super/schools/register →', newTenant)

    return [
      201,
      {
        status: 'ok',
        message: 'Tenant berhasil didaftarkan',
        data: {
          tenant_id: tenantId,
          subdomain: body.subdomain,
          admin_username: body.admin_username || 'admin',
        },
      },
      { delay: DELAY },
    ]
  })

  // ── VER-011: POST /super/schools/:tenant_id/suspend
  mock.onPost(/\/super\/schools\/([^/]+)\/suspend/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/suspend/)
    const tenantId = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')

    const school = mockSchoolTenant.find((s) => s.id === tenantId)
    if (!school) {
      return [404, { error: 'tenant_not_found' }, { delay: DELAY }]
    }

    school.is_suspended = true
    console.info('[MOCK] POST /super/schools/:id/suspend →', tenantId, body.reason)

    return [200, { status: 'ok', message: 'Tenant berhasil ditangguhkan' }, { delay: DELAY }]
  })
  // ── VER-011: POST /super/schools/:tenant_id/unsuspend
  mock.onPost(/\/super\/schools\/([^/]+)\/unsuspend/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/unsuspend/)
    const tenantId = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')

    const school = mockSchoolTenant.find((s) => s.id === tenantId)
    if (!school) {
      return [404, { error: 'tenant_not_found' }, { delay: DELAY }]
    }

    school.is_suspended = false
    console.info('[MOCK] POST /super/schools/:id/unsuspend →', tenantId, body.note)

    return [200, { status: 'ok', message: 'Tenant berhasil diaktifkan kembali' }, { delay: DELAY }]
  })
  // ── VER-011: POST /super/schools/:tenant_id/sync-lock
  mock.onPost(/\/super\/schools\/([^/]+)\/sync-lock/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/sync-lock/)
    const tenantId = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')

    const school = mockSchoolTenant.find((s) => s.id === tenantId)
    if (!school) {
      return [404, { error: 'tenant_not_found' }, { delay: DELAY }]
    }

    school.sync_locked = !!body.locked
    console.info('[MOCK] POST /super/schools/:id/sync-lock →', tenantId, body.locked)

    return [
      200,
      {
        status: 'ok',
        message: `Sync ${body.locked ? 'dikunci' : 'dibuka'}`,
      },
      { delay: DELAY },
    ]
  })

  mock.onGet('/super/schools').reply(() => {
    return [200, mockSchoolTenant, { delay: DELAY }]
  })

  // ── BARU — Onboarding approval queue ─────────────────────────────
  // GET /super/schools/pending
  mock.onGet('/super/schools/pending').reply(() => {
    return [
      200,
      {
        status: 'ok',
        data: cloneMock(pendingSchools),
      },
      { delay: DELAY },
    ]
  })

  // POST /super/schools/:tenant_id/approve
  // Response sesuai hotfix DEC-ONBOARD-PWD-001:
  // { status, message, data: { subdomain, admin_username, temp_password, login_url } }
  mock.onPost(/\/super\/schools\/([^/]+)\/approve/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/approve/)
    const tenantId = match ? match[1] : null

    const idx = pendingSchools.findIndex((s) => s.tenant_id === tenantId)
    if (idx === -1) {
      return [404, { status: 'error', error: 'tenant_not_found' }, { delay: DELAY }]
    }

    const school = pendingSchools[idx]
    pendingSchools.splice(idx, 1)

    const domain = import.meta.env.QCLI_APP_DOMAIN || 'ujian.pw'
    const isLocal = domain.includes('localhost') || domain.includes('127.0.0.1')
    const proto = isLocal ? 'http' : 'https'
    const loginUrl = isLocal
      ? `http://${domain}/?tenant=${school.subdomain}#/auth/admin`
      : `${proto}://${school.subdomain}.${domain}/#/auth/admin`

    return [
      200,
      {
        status: 'ok',
        message: 'School provisioned and activated',
        data: {
          subdomain: school.subdomain,
          admin_username: 'admin',
          temp_password: 'Abc123XyZ789',
          login_url: loginUrl,
        },
      },
      { delay: DELAY },
    ]
  })

  // POST /super/schools/:tenant_id/reject — body { reason }
  mock.onPost(/\/super\/schools\/([^/]+)\/reject/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/reject/)
    const tenantId = match ? match[1] : null

    const idx = pendingSchools.findIndex((s) => s.tenant_id === tenantId)
    if (idx === -1) {
      return [404, { status: 'error', error: 'tenant_not_found' }, { delay: DELAY }]
    }

    pendingSchools.splice(idx, 1)
    return [200, { status: 'ok', message: 'School registration rejected' }, { delay: DELAY }]
  })
}
