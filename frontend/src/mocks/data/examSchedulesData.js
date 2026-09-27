// src/mocks/data/examSchedulesData.js
// Mock Jadwal Ujian (ExamSchedule) — Fase 2b-3-jadwal-2a.

export const mockExamSchedules = [
  {
    id: 'esched-001',
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    academic_year: '2025/2026',
    semester: 'GANJIL',
    tingkat: '10',
    tanggal: '2026-12-03',
    jam_mulai: '07:30',
    durasi_menit: 84,
    subject_id: 'sub-004',
    subject_kode: 'MTK-10',
    subject_nama: 'Matematika',
    kelompok: 'WAJIB',
    jurusan_id: null,
    status: 'DRAFT',
    created_at: '2026-09-27T08:00:00Z',
  },
  {
    id: 'esched-002',
    jenis_ujian_id: 'etype-002',
    jenis_ujian_kode: 'UAS',
    academic_year: '2025/2026',
    semester: 'GANJIL',
    tingkat: '10',
    tanggal: '2026-12-03',
    jam_mulai: '09:00',
    durasi_menit: 90,
    subject_id: 'sub-003',
    subject_kode: 'BIN-10',
    subject_nama: 'Bahasa Indonesia',
    kelompok: 'WAJIB',
    jurusan_id: null,
    status: 'DRAFT',
    created_at: '2026-09-27T08:00:00Z',
  },
]



// ── Helpers
export const calcEndTime = (start, durationMin) => {
  if (!start || !durationMin) return '--:--'
  const [h, m] = String(start).split(':').map(Number)
  const total = h * 60 + m + Number(durationMin)
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

export const dayNameFromDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long' })
}

// ── Auto-generate details per row (kelas match tingkat + jurusan)
export const buildDetailsForRow = (row, classes) => {
  const matched = classes.filter((c) => {
    if (c.tingkat !== row.tingkat) return false
    if (c.status === 'NONAKTIF') return false
    // Mapel WAJIB (jurusan_id null) → semua kelas tingkat
    if (!row.jurusan_id) return true
    // Mapel KEJURUAN → hanya kelas dengan program_keahlian_id match
    return c.program_keahlian_id === row.jurusan_id
  })
  return matched.map((c) => ({
    class_id: c.id,
    class_nama: c.nama,
    ruang_id: c.ruang_id || null,
    ruang_nama: c.ruang_nama || null,
    pengawas_ids: [],
    pengawas_namas: [],
  }))
}

// ── Auto-assign pengawas round-robin
export const autoAssignPengawas = (details, teachers, countPerKelas = 2) => {
  if (!teachers || teachers.length === 0) return details
  let pointer = 0
  return details.map((d) => {
    const picks = []
    for (let i = 0; i < countPerKelas; i++) {
      picks.push(teachers[pointer % teachers.length])
      pointer++
    }
    return {
      ...d,
      pengawas_ids: picks.map((t) => t.id),
      pengawas_namas: picks.map((t) => t.nama),
    }
  })
}


export const resetExamSchedulesMockData = () => {}
