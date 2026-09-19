// src/mocks/handlers/superAdminHandlers.js
import {
  mockSuperDashboardStats,
  mockSuperDashboardLogs,
  mockSchoolTenant,
} from '../data/superadminData'
import { mockPendingSchools, cloneMock } from '../data/onboardingData'

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
  })

  mock.onGet(/\/super\/schools\/([^/]+)\/config/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/config/)
    const slug = match ? match[1] : null

    const schoolData = mockSchoolTenant.find(
      (school) => school.slug.toLowerCase() === slug?.toLowerCase(),
    )

    if (!schoolData) {
      return [
        404,
        { message: `Cluster sekolah '${slug}' tidak dikenali sistem.` },
        { delay: DELAY },
      ]
    }
    return [200, schoolData, { delay: DELAY }]
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
