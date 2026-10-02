// src/mocks/handlers/sessionsHandlers.js
// Handler Sesi Ujian — tenant-aware.

import { cloneMock } from '../data/keahlianData'
import { getStudentsByTenant } from '../data/studentsData'
import { getSchedulesForTenant } from './examSchedulesHandlers'
import { resolveTenant } from '../data/tenantHelpers'
import {
  genSessionToken,
  computeSessionStatusByTime,
  getSessionSeedsByTenant,
  setTokenTtl,
  computeRemainingSeconds,
  enrichForExisting,
  DEFAULT_TOKEN_TTL_SECONDS,
} from '../data/sessionsData'
import {
  generateParticipants,
  generateViolations,
  generateActivities,
} from '../data/sessionActivitiesData'

const DELAY = 300

// ── Per-tenant store
const sessionsStore = {} // { tenant: [...] }

const ensureStore = (tenant) => {
  if (!sessionsStore[tenant]) {
    sessionsStore[tenant] = cloneMock(getSessionSeedsByTenant(tenant))
  }
  return sessionsStore[tenant]
}

export const resetSessionsMockData = () => {
  Object.keys(sessionsStore).forEach((k) => delete sessionsStore[k])
}

// ── Expose store ke window untuk handler lain (examHandlers, dsb)
const refreshWindowStore = () => {
  if (typeof window !== 'undefined') {
    window.__sessionsStore = sessionsStore
  }
}

// ── Auto-generate sessions dari jadwal × detail (per tenant)
const syncSessionsFromSchedules = (tenant) => {
  const store = ensureStore(tenant)
  const schedules = getSchedulesForTenant(tenant) || []
  const existingKeys = new Set(store.map((s) => `${s.schedule_id}::${s.class_id}`))
  let created = 0

  schedules.forEach((sch) => {
    const details = Array.isArray(sch.details) ? sch.details : []
    details.forEach((d) => {
      const key = `${sch.id}::${d.class_id}`
      if (existingKeys.has(key)) return

      const students = getStudentsByTenant(tenant).filter(
        (s) => s.kelas_id === d.class_id && s.status === 'AKTIF',
      )

      const newSession = {
        id: `sesi-${tenant}-${Date.now()}-${created}`,
        tenant_slug: tenant,
        schedule_id: sch.id,
        class_id: d.class_id,
        class_nama: d.class_nama,
        subject_id: sch.subject_id,
        subject_kode: sch.subject_kode,
        subject_nama: sch.subject_nama,
        tingkat: sch.tingkat,
        tanggal: sch.tanggal,
        jam_mulai: sch.jam_mulai,
        durasi_menit: sch.durasi_menit,
        ruang_id: d.ruang_id || null,
        ruang_nama: d.ruang_nama || null,
        pengawas_ids: d.pengawas_ids || [],
        pengawas_namas: d.pengawas_namas || [],
        jenis_ujian_id: sch.jenis_ujian_id,
        jenis_ujian_kode: sch.jenis_ujian_kode,
        token: genSessionToken(),
        status: computeSessionStatusByTime(sch),
        actual_start: null,
        actual_end: null,
        paused_at: null,
        extended_minutes: 0,
        participant_count: students.length,
        active_count: 0,
        completed_count: 0,
        created_at: new Date().toISOString(),
      }
      store.push(newSession)
      created++
    })
  })

  // Sync status by time untuk existing (kecuali demo)
  store.forEach((s) => {
    if (s.is_demo) return
    if (s.status === 'SCHEDULED' || s.status === 'ACTIVE') {
      const auto = computeSessionStatusByTime(s)
      if (auto === 'ACTIVE' && s.status === 'SCHEDULED') s.status = 'ACTIVE'
      else if (auto === 'COMPLETED') s.status = 'COMPLETED'
    }
  })

  return created
}

export const sessionsHandlers = (mock) => {
  refreshWindowStore()

  // ── LIST (silent auto-generate per tenant)
  mock.onGet('/admin/sessions').reply((config) => {
    const tenant = resolveTenant(config)
    syncSessionsFromSchedules(tenant)
    const store = ensureStore(tenant)
    const { search, tanggal, ruang, status, jenis_ujian_id, exam_id, active_only } =
      config.params || {}

    let list = cloneMock(store)

    const isActiveOnly = active_only === 'true' || active_only === true
    if (isActiveOnly) {
      list = list.filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED')
    }
    if (exam_id) list = list.filter((s) => s.subject_id === exam_id)
    if (tanggal) list = list.filter((s) => s.tanggal === tanggal)
    if (ruang) list = list.filter((s) => s.ruang_id === ruang || s.ruang_nama === ruang)
    if (status) list = list.filter((s) => s.status === status)
    if (jenis_ujian_id) list = list.filter((s) => s.jenis_ujian_id === jenis_ujian_id)
    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(
        (s) =>
          (s.subject_nama || '').toLowerCase().includes(q) ||
          (s.class_nama || '').toLowerCase().includes(q) ||
          (s.ruang_nama || '').toLowerCase().includes(q),
      )
    }

    list.sort((a, b) => {
      const t = (a.tanggal || '').localeCompare(b.tanggal || '')
      if (t !== 0) return t
      return (a.jam_mulai || '').localeCompare(b.jam_mulai || '')
    })

    const enriched = list.map((s) => ({
      ...enrichForExisting(s),
      remaining_seconds: computeRemainingSeconds(s),
    }))

    return [200, { status: 'ok', data: enriched, count: enriched.length }, { delay: DELAY }]
  })

  // ── SYNC ULANG (manual)
  mock.onPost('/admin/sessions/sync').reply((config) => {
    const tenant = resolveTenant(config)
    const created = syncSessionsFromSchedules(tenant)
    refreshWindowStore()
    return [200, { status: 'ok', created, total: ensureStore(tenant).length }, { delay: DELAY }]
  })

  // ── GET 1
  mock.onGet(/\/admin\/sessions\/([^/]+)$/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)/)[1]
    const s = ensureStore(tenant).find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    return [200, { status: 'ok', data: enrichForExisting(s) }, { delay: DELAY }]
  })

  // ── UPDATE
  mock.onPut(/\/admin\/sessions\/([^/]+)$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)/)[1]
    const body = JSON.parse(config.data || '{}')
    const idx = store.findIndex((s) => s.id === id)
    if (idx === -1) return [404, { error: 'not_found' }, { delay: DELAY }]
    store[idx] = { ...store[idx], ...body, id }
    return [200, { status: 'ok', data: cloneMock(store[idx]) }, { delay: DELAY }]
  })

  // ── ACTION: Start
  mock.onPost(/\/admin\/sessions\/([^/]+)\/start$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/start/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    if (s.status === 'ACTIVE' || s.status === 'COMPLETED') {
      return [
        409,
        { error: 'invalid_state', message: 'Sesi sudah aktif/selesai' },
        { delay: DELAY },
      ]
    }
    s.status = 'ACTIVE'
    s.actual_start = new Date().toISOString()
    s.paused_at = null
    setTokenTtl(s, DEFAULT_TOKEN_TTL_SECONDS)
    return [200, { status: 'ok', data: cloneMock(s) }, { delay: DELAY }]
  })

  // ── ACTION: Pause
  mock.onPost(/\/admin\/sessions\/([^/]+)\/pause$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/pause/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    if (s.status !== 'ACTIVE') {
      return [
        409,
        { error: 'invalid_state', message: 'Hanya sesi aktif yang bisa dipause' },
        { delay: DELAY },
      ]
    }
    s.status = 'PAUSED'
    s.paused_at = new Date().toISOString()
    return [200, { status: 'ok', data: cloneMock(s) }, { delay: DELAY }]
  })

  // ── ACTION: Resume
  mock.onPost(/\/admin\/sessions\/([^/]+)\/resume$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/resume/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    if (s.status !== 'PAUSED') {
      return [
        409,
        { error: 'invalid_state', message: 'Hanya sesi ditunda yang bisa dilanjutkan' },
        { delay: DELAY },
      ]
    }
    if (s.paused_at) {
      const pausedMs = Date.now() - new Date(s.paused_at).getTime()
      const pausedMin = Math.round(pausedMs / 60000)
      s.extended_minutes = (s.extended_minutes || 0) + pausedMin
    }
    s.status = 'ACTIVE'
    s.paused_at = null
    setTokenTtl(s, DEFAULT_TOKEN_TTL_SECONDS)
    return [200, { status: 'ok', data: cloneMock(s) }, { delay: DELAY }]
  })

  // ── ACTION: End
  mock.onPost(/\/admin\/sessions\/([^/]+)\/end$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/end/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    if (s.status === 'COMPLETED') {
      return [409, { error: 'invalid_state', message: 'Sesi sudah selesai' }, { delay: DELAY }]
    }
    s.status = 'COMPLETED'
    s.actual_end = new Date().toISOString()
    s.paused_at = null
    return [200, { status: 'ok', data: cloneMock(s) }, { delay: DELAY }]
  })

  // ── ACTION: Extend
  mock.onPost(/\/admin\/sessions\/([^/]+)\/extend$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/extend/)[1]
    const body = JSON.parse(config.data || '{}')
    const minutes = Number(body.minutes) || 0
    if (minutes <= 0 || minutes > 120) {
      return [400, { error: 'invalid_minutes', message: 'Minutes harus 1-120' }, { delay: DELAY }]
    }
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    if (s.status === 'COMPLETED') {
      return [409, { error: 'invalid_state', message: 'Sesi sudah selesai' }, { delay: DELAY }]
    }
    s.extended_minutes = (s.extended_minutes || 0) + minutes
    return [
      200,
      { status: 'ok', message: `Waktu ditambah ${minutes} menit`, data: cloneMock(s) },
      { delay: DELAY },
    ]
  })

  // ── ACTION: Force submit
  mock.onPost(/\/admin\/sessions\/([^/]+)\/force-submit$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/force-submit/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    if (s.status === 'COMPLETED') {
      return [409, { error: 'invalid_state', message: 'Sesi sudah selesai' }, { delay: DELAY }]
    }
    const forced = s.participant_count - (s.completed_count || 0)
    s.completed_count = s.participant_count
    s.active_count = 0
    s.status = 'COMPLETED'
    s.actual_end = new Date().toISOString()
    return [
      200,
      { status: 'ok', message: `${forced} peserta di-force submit`, data: cloneMock(s) },
      { delay: DELAY },
    ]
  })

  // ── ACTION: Regenerate token
  mock.onPost(/\/admin\/sessions\/([^/]+)\/regenerate-token$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/regenerate-token/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    s.token = genSessionToken()
    return [200, { status: 'ok', data: cloneMock(s) }, { delay: DELAY }]
  })

  // ── GET /admin/sessions/:id/token
  mock.onGet(/\/admin\/sessions\/([^/]+)\/token$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/token/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]

    if (!s.valid_until && s.status !== 'COMPLETED') {
      setTokenTtl(s, DEFAULT_TOKEN_TTL_SECONDS)
    }

    const remaining = computeRemainingSeconds(s)
    if (s.status === 'ACTIVE' && remaining <= 0 && s.valid_until) {
      s.token = genSessionToken()
      setTokenTtl(s, DEFAULT_TOKEN_TTL_SECONDS)
    }

    return [
      200,
      {
        token: s.token,
        valid_from: s.valid_from,
        valid_until: s.valid_until,
        remaining_seconds: computeRemainingSeconds(s),
        session_id: s.id,
        subject_nama: s.subject_nama,
        class_nama: s.class_nama,
        status: s.status,
      },
      { delay: DELAY },
    ]
  })

  // ── POST /admin/sessions/:id/token/rotate
  mock.onPost(/\/admin\/sessions\/([^/]+)\/token\/rotate$/).reply((config) => {
    const tenant = resolveTenant(config)
    const store = ensureStore(tenant)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/token\/rotate/)[1]
    const s = store.find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]

    s.token = genSessionToken()
    setTokenTtl(s, DEFAULT_TOKEN_TTL_SECONDS)

    return [
      200,
      {
        status: 'ok',
        message: 'Token di-rotate',
        token: s.token,
        valid_from: s.valid_from,
        valid_until: s.valid_until,
        remaining_seconds: computeRemainingSeconds(s),
      },
      { delay: DELAY },
    ]
  })

  // ── GET /admin/sessions/:id/participants
  mock.onGet(/\/admin\/sessions\/([^/]+)\/participants$/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/participants/)[1]
    const s = ensureStore(tenant).find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    const list = generateParticipants(s)
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // ── GET /admin/sessions/:id/violations
  mock.onGet(/\/admin\/sessions\/([^/]+)\/violations$/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/violations/)[1]
    const s = ensureStore(tenant).find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    const participants = generateParticipants(s)
    const list = generateViolations(s, participants)
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })

  // ── GET /admin/sessions/:id/activities
  mock.onGet(/\/admin\/sessions\/([^/]+)\/activities$/).reply((config) => {
    const tenant = resolveTenant(config)
    const id = config.url.match(/\/admin\/sessions\/([^/]+)\/activities/)[1]
    const s = ensureStore(tenant).find((x) => x.id === id)
    if (!s) return [404, { error: 'not_found' }, { delay: DELAY }]
    const participants = generateParticipants(s)
    const list = generateActivities(s, participants)
    return [200, { status: 'ok', data: list, count: list.length }, { delay: DELAY }]
  })
}
