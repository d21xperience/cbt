// src/mocks/handlers/scheduleHandlers.js
import { jurusanOptions, mockAllSubjectsForm, getInitialSchedules } from '../data/scheduleData'

const DELAY = 300

// State dinamis untuk jadwal (dapat di-reset)
let scheduleStore = getInitialSchedules()

export const resetScheduleData = () => {
  scheduleStore = getInitialSchedules()
  console.log('🔄 [MOCK] Jadwal di-reset ke state awal')
}

export const scheduleHandlers = (mock) => {
  // GET: Ambil daftar jadwal
  mock.onGet('/admin/schedules-list').reply(() => {
    const cloned = JSON.parse(JSON.stringify(scheduleStore))
    return [200, cloned, { delay: DELAY }]
  })

  // GET: Daftar jurusan (untuk SMK)
  mock.onGet('/admin/majors').reply(() => {
    return [200, jurusanOptions, { delay: DELAY }]
  })

  // GET: Mata pelajaran untuk input massal
  mock.onGet('/admin/all-subjects-form').reply(() => {
    return [200, mockAllSubjectsForm, { delay: DELAY }]
  })

  // POST: Simpan jadwal massal
  mock.onPost('/admin/schedules-massal').reply((config) => {
    const body = JSON.parse(config.data)
    const newSchedules = body.schedules.map((s, index) => ({
      id: index + 1,
      day_name: 'Terjadwal',
      start_date: s.date,
      start_time: s.start_time,
      duration_minutes: s.duration,
      subject_name: s.subject_name,
      grade_level: body.grade,
      is_active: false,
      is_susulan: false,
    }))
    // Timpa atau gabung? Di sini kita replace seluruh data
    scheduleStore = newSchedules
    return [201, { status: 'success' }, { delay: DELAY }]
  })
}
