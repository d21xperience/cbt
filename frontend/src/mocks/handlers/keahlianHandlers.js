// src/mocks/handlers/keahlianHandlers.js
import {
  mockBidangKeahlian,
  mockProgramKeahlian,
  buildInitialAssignments,
  enrichProgramWithBidang,
  cloneMock,
} from '../data/keahlianData'
import { mockSchoolTenant } from '../data/superadminData'   // ← BARU

const DELAY = 200

// ── In-memory state
let assignments = buildInitialAssignments()

export const resetKeahlianMockData = () => {
  assignments = buildInitialAssignments()
}

// Helper: cari tenant by slug → UUID
const findTenantIdBySlug = (slug) => {
  const found = mockSchoolTenant.find((t) => t.slug === slug)
  return found?.id || null
}

const getProgramsForTenant = (tenantId) => {
  const ids = assignments[tenantId] || []
  return ids
    .map((id) => mockProgramKeahlian.find((p) => p.id === id))
    .filter(Boolean)
    .map(enrichProgramWithBidang)
}

const addProgramToTenant = (tenantId, programId) => {
  const program = mockProgramKeahlian.find((p) => p.id === programId)
  if (!program) return { ok: false, error: 'program_not_found' }
  if (!assignments[tenantId]) assignments[tenantId] = []
  if (assignments[tenantId].includes(programId)) {
    return { ok: false, error: 'already_assigned' }
  }
  assignments[tenantId].push(programId)
  return { ok: true, program: enrichProgramWithBidang(program) }
}

const removeProgramFromTenant = (tenantId, programId) => {
  if (!assignments[tenantId]) return { ok: false, error: 'tenant_not_found' }
  const idx = assignments[tenantId].indexOf(programId)
  if (idx === -1) return { ok: false, error: 'not_assigned' }
  assignments[tenantId].splice(idx, 1)
  return { ok: true }
}

export const keahlianHandlers = (mock) => {
  // ═══ PUBLIC REFERENCES (tidak berubah) ═══
  mock.onGet('/public/references/bidang-keahlian').reply(() => {
    const data = cloneMock(mockBidangKeahlian)
    return [200, { status: 'ok', data, count: data.length }, { delay: DELAY }]
  })

  mock.onGet('/public/references/program-keahlian').reply((config) => {
    const params = config.params || {}
    let list = cloneMock(mockProgramKeahlian)
    if (params.bidang) list = list.filter((p) => p.bidang_id === params.bidang)
    if (params.default === 'true' || params.default === true) {
      list = list.filter((p) => p.is_default)
    }
    const data = list.map(enrichProgramWithBidang)
    return [200, { status: 'ok', data, count: data.length }, { delay: DELAY }]
  })

  // ═══ ADMIN — find-or-create (tidak berubah) ═══
  mock.onPost('/admin/program-keahlian/find-or-create').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    const { kode, nama, bidang_id } = body
    if (!kode || !nama) {
      return [400, { status: 'error', error: 'kode & nama wajib' }, { delay: DELAY }]
    }
    const existing = mockProgramKeahlian.find((p) => p.kode === kode)
    if (existing) {
      return [200, { status: 'ok', created: false, data: enrichProgramWithBidang(existing) }, { delay: DELAY }]
    }
    const newProgram = {
      id: `prog-custom-${Date.now()}`,
      bidang_id: bidang_id || 'TI',
      kode, nama,
      deskripsi: body.deskripsi || '',
      is_default: false,
      is_custom: true,
      sort_order: 999,
      created_by: 'mock-admin-uuid',
    }
    mockProgramKeahlian.push(newProgram)
    return [201, { status: 'ok', created: true, data: enrichProgramWithBidang(newProgram) }, { delay: DELAY }]
  })

  // ═══ ADMIN — programs (tenant-scoped, resolve slug → UUID) ═══
  mock.onGet('/admin/programs').reply((config) => {
    const slug = config.headers['X-Tenant-Slug'] || 'smknkawali'
    const tenantId = findTenantIdBySlug(slug)
    const data = tenantId ? getProgramsForTenant(tenantId) : []
    return [200, { status: 'ok', data, count: data.length }, { delay: DELAY }]
  })

  mock.onPost('/admin/programs/assign').reply((config) => {
    const slug = config.headers['X-Tenant-Slug'] || 'smknkawali'
    const tenantId = findTenantIdBySlug(slug)
    if (!tenantId) {
      return [400, { status: 'error', error: 'tenant_not_found' }, { delay: DELAY }]
    }
    const body = JSON.parse(config.data || '{}')
    const result = addProgramToTenant(tenantId, body.program_id)
    if (!result.ok) return [400, { status: 'error', error: result.error }, { delay: DELAY }]
    return [200, { status: 'ok', message: 'Program berhasil di-assign' }, { delay: DELAY }]
  })

  mock.onPost('/admin/programs/remove').reply((config) => {
    const slug = config.headers['X-Tenant-Slug'] || 'smknkawali'
    const tenantId = findTenantIdBySlug(slug)
    if (!tenantId) {
      return [400, { status: 'error', error: 'tenant_not_found' }, { delay: DELAY }]
    }
    const body = JSON.parse(config.data || '{}')
    const result = removeProgramFromTenant(tenantId, body.program_id)
    if (!result.ok) return [400, { status: 'error', error: result.error }, { delay: DELAY }]
    return [200, { status: 'ok', message: 'Program dihapus dari tenant' }, { delay: DELAY }]
  })

  // ═══ SUPER ADMIN — per-tenant programs (path pakai UUID, tidak berubah) ═══
  mock.onGet(/\/super\/schools\/([^/]+)\/programs$/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/programs$/)
    const tenantId = match ? match[1] : null
    const data = getProgramsForTenant(tenantId)
    return [200, { status: 'ok', data, count: data.length }, { delay: DELAY }]
  })

  mock.onPost(/\/super\/schools\/([^/]+)\/programs\/assign/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/programs\/assign/)
    const tenantId = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')
    const result = addProgramToTenant(tenantId, body.program_id)
    if (!result.ok) return [400, { status: 'error', error: result.error }, { delay: DELAY }]
    return [200, { status: 'ok', message: 'Program berhasil di-assign' }, { delay: DELAY }]
  })

  mock.onPost(/\/super\/schools\/([^/]+)\/programs\/remove/).reply((config) => {
    const match = config.url.match(/\/super\/schools\/([^/]+)\/programs\/remove/)
    const tenantId = match ? match[1] : null
    const body = JSON.parse(config.data || '{}')
    const result = removeProgramFromTenant(tenantId, body.program_id)
    if (!result.ok) return [400, { status: 'error', error: result.error }, { delay: DELAY }]
    return [200, { status: 'ok', message: 'Program dihapus dari tenant' }, { delay: DELAY }]
  })
}
