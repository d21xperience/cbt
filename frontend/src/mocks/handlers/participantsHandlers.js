// src/mocks/handlers/participantsHandlers.js
import { mockParticipants, mockExams } from '../data/participantsData'
import { cloneMock } from '../data/keahlianData'

const DELAY = 300

let participants = cloneMock(mockParticipants)

export const resetParticipantsMockData = () => {
  participants = cloneMock(mockParticipants)
}

export const participantsHandlers = (mock) => {
  // ══════════════════════════════════════════════════════
  // GET /admin/participants — list + filter
  // ══════════════════════════════════════════════════════
  mock.onGet('/admin/participants').reply((config) => {
    const { exam_id, source, search } = config.params || {}
    let list = cloneMock(participants)

    if (exam_id) list = list.filter((p) => p.exam_id === exam_id)
    if (source) list = list.filter((p) => p.source === source)
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(
        (p) =>
          String(p.name || '')
            .toLowerCase()
            .includes(q) ||
          String(p.nisn || '')
            .toLowerCase()
            .includes(q) ||
          String(p.participant_id || '')
            .toLowerCase()
            .includes(q),
      )
    }

    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // ══════════════════════════════════════════════════════
  // GET /admin/exams — dropdown filter
  // ══════════════════════════════════════════════════════
  mock.onGet('/admin/exams').reply(() => {
    return [200, { status: 'ok', data: mockExams, count: mockExams.length }, { delay: DELAY }]
  })

  // ══════════════════════════════════════════════════════
  // DELETE /admin/participants/:id
  // ══════════════════════════════════════════════════════
  mock.onDelete(/\/admin\/participants\/([^/]+)/).reply((config) => {
    const id = config.url.match(/\/admin\/participants\/([^/]+)/)[1]
    console.info('[MOCK] DELETE /admin/participants/:id →', id)

    const idx = participants.findIndex((p) => p.id === id)
    if (idx === -1) {
      return [404, { error: 'participant_not_found' }, { delay: DELAY }]
    }

    // Guard: SIAKAD tidak bisa dihapus
    if (participants[idx].source === 'SIAKAD') {
      return [
        400,
        {
          error: 'siakad_locked',
          message: 'Peserta dari SIAKAD tidak dapat dihapus.',
        },
        { delay: DELAY },
      ]
    }

    participants.splice(idx, 1)
    return [200, { status: 'ok', message: 'Peserta dihapus' }, { delay: DELAY }]
  })

  // ══════════════════════════════════════════════════════
  // POST /admin/participants/import-external
  //  - ?preview=true → return preview rows (tidak simpan)
  //  - default       → commit, return imported_count
  // ══════════════════════════════════════════════════════
  mock.onPost('/admin/participants/import-external').reply((config) => {
    const params = config.params || {}
    const isPreview = params.preview === 'true' || params.preview === true

    console.info('[MOCK] POST /admin/participants/import-external preview=', isPreview)

    if (isPreview) {
      const preview = [
        {
          _rowNumber: 1,
          participant_id: 'EXT-101',
          nisn: '99000101',
          name: 'Gita Sari',
          class: '11 IPS 1',
          _error: null,
        },
        {
          _rowNumber: 2,
          participant_id: 'EXT-102',
          nisn: '99000102',
          name: 'Hadi Widodo',
          class: '11 IPS 2',
          _error: null,
        },
        {
          _rowNumber: 3,
          participant_id: 'EXT-103',
          nisn: '',
          name: '',
          class: '',
          _error: 'NISN, Nama, Kelas wajib diisi',
        },
      ]
      return [200, { status: 'ok', data: preview, errors: [] }, { delay: DELAY }]
    }

    // ── Commit
    let body = {}
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    } catch {
      body = {}
    }

    const importedCount = 2
    const now = new Date().toISOString()

    for (let i = 0; i < importedCount; i += 1) {
      participants.push({
        id: `p-import-${Date.now()}-${i}`,
        participant_id: `EXT-${String(i + 101).padStart(3, '0')}`,
        nisn: `99000${String(i + 101).padStart(3, '0')}`,
        name: i === 0 ? 'Gita Sari' : 'Hadi Widodo',
        class: '11 IPS 1',
        rombel: '11 IPS 1',
        source: 'EXTERNAL',
        exam_id: body.exam_id || null,
        exam_name: '',
        is_active: true,
        created_at: now,
      })
    }

    return [200, { status: 'ok', imported_count: importedCount }, { delay: DELAY }]
  })
}
