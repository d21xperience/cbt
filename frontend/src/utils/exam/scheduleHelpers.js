// src/utils/exam/scheduleHelpers.js
// Helper murni untuk modul Jadwal Ujian.
// ⚠️ TIDAK boleh import dari @/mocks/* — semua fungsi pure/parameterized.

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
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' })
}

export const buildTingkatList = (jenjang, durationYears = 3) => {
  const j = String(jenjang || '').toUpperCase()
  const out = []
  if (j === 'SMP' || j === 'MTS') {
    for (let i = 7; i <= 9; i++) out.push(String(i))
  } else if (j === 'SMA' || j === 'MA') {
    for (let i = 10; i <= 12; i++) out.push(String(i))
  } else if (j === 'SMK' || j === 'MAK') {
    const dur = Number(durationYears) || 3
    for (let i = 10; i < 10 + dur; i++) out.push(String(i))
  } else {
    for (let i = 10; i <= 12; i++) out.push(String(i))
  }
  return out
}

export const hasMajor = (jenjang) => {
  const j = String(jenjang || '').toUpperCase()
  return j === 'SMK' || j === 'MAK'
}

export const buildDetailsForRow = (row, classes = []) => {
  const matched = classes.filter((c) => {
    if (c.tingkat !== row.tingkat) return false
    if (c.status === 'NONAKTIF') return false
    if (!row.jurusan_id) return true
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

export const autoAssignPengawas = (details = [], teachers = [], countPerKelas = 2) => {
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

export const groupSchedulesByTingkatTanggal = (schedules = []) => {
  const grouped = {}
  schedules.forEach((s) => {
    if (!grouped[s.tingkat]) grouped[s.tingkat] = {}
    if (!grouped[s.tingkat][s.tanggal]) grouped[s.tingkat][s.tanggal] = []
    grouped[s.tingkat][s.tanggal].push(s)
  })
  const out = {}
  Object.keys(grouped)
    .sort()
    .forEach((t) => {
      out[t] = {}
      Object.keys(grouped[t])
        .sort()
        .forEach((d) => {
          out[t][d] = grouped[t][d].sort((a, b) =>
            (a.jam_mulai || '').localeCompare(b.jam_mulai || ''),
          )
        })
    })
  return out
}
