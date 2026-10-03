// src/mocks/handlers/participantsHandlers.js
// Handler Data Peserta — derive dari mockStudentsByTenant (source of truth).
// Peserta = siswa AKTIF (SISWA) + import external (EXTERNAL).
import { setOverride } from '../data/passwordOverrides'
import { getStudentsByTenant } from '../data/studentsData'
import { resolveTenant } from '../data/tenantHelpers'
import { generateRandomPassword } from '../data/passwordUtils'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

// ── Store khusus peserta EXTERNAL (per tenant)
const externalStore = {}

const ensureExternalStore = (tenant) => {
  if (!externalStore[tenant]) externalStore[tenant] = []
  return externalStore[tenant]
}

export const resetParticipantsMockData = () => {
  Object.keys(externalStore).forEach((k) => delete externalStore[k])
}

// ── Derived: siswa AKTIF → peserta canonical
const studentToParticipant = (student) => ({
  id: student.id,
  nis: student.nis || '',
  nisn: student.nisn || '',
  nama: student.nama,
  kelas_id: student.kelas_id,
  kelas_nama: student.kelas_nama,
  status: student.status,
  exam_password: student.exam_password || '',
  source: 'SISWA',
  tenant_slug: student.tenant_slug,
})

const buildParticipants = (tenant) => {
  const students = getStudentsByTenant(tenant)
    .filter((s) => s.status === 'AKTIF')
    .map(studentToParticipant)
  const external = ensureExternalStore(tenant)
  return [...students, ...external]
}

export const participantsHandlers = (mock) => {
  // ── LIST
  mock.onGet('/admin/participants').reply((config) => {
    const tenant = resolveTenant(config)
    const { source, search } = config.params || {}
    let list = cloneMock(buildParticipants(tenant))

    if (source) list = list.filter((p) => p.source === source)
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(
        (p) =>
          String(p.nama || '')
            .toLowerCase()
            .includes(q) ||
          String(p.nisn || '')
            .toLowerCase()
            .includes(q) ||
          String(p.nis || '')
            .toLowerCase()
            .includes(q),
      )
    }

    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // ── POST /admin/participants/:id/reset-password
  mock.onPost(/\/admin\/participants\/([^/]+)\/reset-password$/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/participants\/([^/]+)\/reset-password/)[1]

    const students = getStudentsByTenant(tenant)
    const student = students.find((s) => s.id === id)

    if (!student) {
      return [404, { error: 'student_not_found' }, { delay: DELAY }]
    }

    const newPassword = generateRandomPassword()
    setOverride(tenant, id, newPassword)

    console.info(`🔑 [MOCK] Reset password ${tenant}/${id} → ${newPassword}`)

    return [
      200,
      {
        status: 'ok',
        message: 'Password berhasil di-reset.',
        data: { id, exam_password: newPassword },
      },
      { delay: DELAY },
    ]
  })

  // ── DELETE — hanya EXTERNAL
  mock.onDelete(/\/admin\/participants\/([^/]+)/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/participants\/([^/]+)/)[1]
    const store = ensureExternalStore(tenant)

    const idx = store.findIndex((p) => p.id === id)
    if (idx === -1) {
      return [
        400,
        { error: 'siakad_locked', message: 'Peserta dari SISWA tidak dapat dihapus.' },
        { delay: DELAY },
      ]
    }

    store.splice(idx, 1)
    return [200, { status: 'ok', message: 'Peserta dihapus' }, { delay: DELAY }]
  })

  // ── POST import-external
  mock.onPost('/admin/participants/import-external').reply((config) => {
    const tenant = resolveTenant(config)
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          nisn: '99000101',
          nama: 'Gita Sari',
          kelas_nama: '11 IPS 1',
          _error: null,
        },
        {
          _rowNumber: 2,
          nisn: '99000102',
          nama: 'Hadi Widodo',
          kelas_nama: '11 IPS 2',
          _error: null,
        },
        {
          _rowNumber: 3,
          nisn: '',
          nama: '',
          kelas_nama: '',
          _error: 'NISN, Nama, Kelas wajib diisi',
        },
      ]
      return [200, { status: 'ok', data: preview, errors: [] }, { delay: DELAY }]
    }

    let body = {}
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    } catch {
      /* ignore */
    }

    const importedCount = 2
    const store = ensureExternalStore(tenant)
    const now = new Date().toISOString()

    for (let i = 0; i < importedCount; i += 1) {
      store.push({
        id: `p-ext-${tenant}-${Date.now()}-${i}`,
        nis: '',
        nisn: `99000${String(i + 101).padStart(3, '0')}`,
        nama: i === 0 ? 'Gita Sari' : 'Hadi Widodo',
        kelas_id: null,
        kelas_nama: '11 IPS 1',
        status: 'AKTIF',
        exam_password: generateRandomPassword(),
        source: 'EXTERNAL',
        exam_id: body.exam_id || null,
        tenant_slug: tenant,
        created_at: now,
      })
    }

    return [200, { status: 'ok', imported_count: importedCount }, { delay: DELAY }]
  })
}
