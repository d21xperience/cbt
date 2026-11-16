// src/composables/admin/useExamScheduleWizard.js
// Refactored — semua data via Service, tidak ada import dari @/mocks/*.

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { SubjectService } from '@/services/admin/SubjectService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { ClassService } from '@/services/admin/ClassService'
import { TeacherService } from '@/services/admin/TeacherService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'
import {
  calcEndTime,
  buildTingkatList,
  hasMajor,
  buildDetailsForRow,
  autoAssignPengawas,
} from '@/utils/exam/scheduleHelpers'

export function useExamScheduleWizard() {
  const $q = useQuasar()

  const saving = ref(false)
  const loadingRefs = ref(false)

  const context = ref({
    jenis_ujian_id: 'etype-002',
    academic_year: '2025/2026',
    semester: 'GANJIL',
  })

  const subjectRows = ref([])
  const assignRows = ref([])

  // ── Reference data via service
  const examTypes = ref([])
  const subjects = ref([])
  const classes = ref([])
  const teachers = ref([])
  const programs = ref([])

  const examTypeOptions = computed(() =>
    examTypes.value.map((t) => ({ label: `${t.kode} — ${t.nama}`, value: t.id })),
  )
  const semesterOptions = [
    { label: 'Ganjil', value: 'GANJIL' },
    { label: 'Genap', value: 'GENAP' },
  ]
  const academicYearOptions = [
    { label: '2025/2026', value: '2025/2026' },
    { label: '2026/2027', value: '2026/2027' },
  ]

  const teacherOptions = computed(() =>
    teachers.value
      .filter((t) => t.status === 'AKTIF')
      .map((t) => ({ label: `${t.nama}${t.nip ? ` (${t.nip})` : ''}`, value: t.id })),
  )

  const ruangOptionsAll = computed(() => {
    const seen = new Map()
    classes.value.forEach((c) => {
      if (c.ruang_id && !seen.has(c.ruang_id)) {
        seen.set(c.ruang_id, { label: c.ruang_nama || c.ruang_id, value: c.ruang_id })
      }
    })
    return Array.from(seen.values())
  })

  // ── Load reference data (dipanggil dari step 1 → 2)
  const loadReferenceData = async () => {
    loadingRefs.value = true
    try {
      const [etRes, subjRes, clsRes, tchRes, prgRes] = await Promise.allSettled([
        ExamTypeService.list(),
        SubjectService.list(),
        ClassService.list(),
        TeacherService.list(),
        ProgramKeahlianService.getAssignedPrograms(),
      ])

      if (etRes.status === 'fulfilled') {
        examTypes.value = etRes.value.data?.data || etRes.value.data || []
      }
      if (subjRes.status === 'fulfilled') {
        subjects.value = subjRes.value.data?.data || subjRes.value.data || []
      }
      if (clsRes.status === 'fulfilled') {
        classes.value = clsRes.value.data?.data || clsRes.value.data || []
      }
      if (tchRes.status === 'fulfilled') {
        teachers.value = tchRes.value.data?.data || tchRes.value.data || []
      }
      if (prgRes.status === 'fulfilled') {
        programs.value = prgRes.value.data?.data || prgRes.value.data || []
      }
    } catch (e) {
      console.error('[Wizard] loadReferenceData failed', e)
      $q.notify({ type: 'negative', message: 'Gagal memuat data referensi' })
    } finally {
      loadingRefs.value = false
    }
  }

  // ── Build subjectRows (WAJIB + KEJURUAN)
  const buildSubjectRows = (jenjang, durationYears = 3) => {
    const tingkatList = buildTingkatList(jenjang, durationYears)
    const rows = []

    const wajib = subjects.value.filter(
      (s) => s.kelompok === 'WAJIB' && tingkatList.includes(s.tingkat),
    )
    tingkatList.forEach((t) => {
      const subj = wajib.filter((s) => s.tingkat === t)
      subj.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''))
      subj.forEach((s) => {
        rows.push({
          _key: `W-${t}-${s.id}`,
          tingkat: t,
          subject_id: s.id,
          subject_kode: s.kode,
          subject_nama: s.nama,
          kelompok: 'WAJIB',
          jurusan_id: null,
          jurusan_nama: null,
          tanggal: '',
          jam_mulai: '',
          durasi_menit: 90,
        })
      })
    })

    if (hasMajor(jenjang)) {
      const kejuruan = subjects.value.filter(
        (s) => s.kelompok === 'KEJURUAN' && tingkatList.includes(s.tingkat),
      )
      const jurusanIds = [...new Set(kejuruan.map((s) => s.jurusan_id).filter(Boolean))]
      jurusanIds.forEach((jid) => {
        const jr = programs.value.find((p) => p.id === jid)
        const subj = kejuruan.filter((s) => s.jurusan_id === jid)
        subj.sort((a, b) => (a.kode || '').localeCompare(b.kode || ''))
        subj.forEach((s) => {
          rows.push({
            _key: `K-${s.tingkat}-${s.id}`,
            tingkat: s.tingkat,
            subject_id: s.id,
            subject_kode: s.kode,
            subject_nama: s.nama,
            kelompok: 'KEJURUAN',
            jurusan_id: jid,
            jurusan_nama: jr?.nama || jid,
            tanggal: '',
            jam_mulai: '',
            durasi_menit: 120,
          })
        })
      })
    }

    subjectRows.value = rows
  }

  const wajibRows = computed(() => subjectRows.value.filter((r) => r.kelompok === 'WAJIB'))
  const kejuruanRows = computed(() => subjectRows.value.filter((r) => r.kelompok === 'KEJURUAN'))

  const groupedWajibByTingkat = computed(() => {
    const g = {}
    wajibRows.value.forEach((r) => {
      if (!g[r.tingkat]) g[r.tingkat] = []
      g[r.tingkat].push(r)
    })
    return g
  })

  const groupedKejuruanByTingkat = computed(() => {
    const byTingkat = {}
    kejuruanRows.value.forEach((r) => {
      if (!byTingkat[r.tingkat]) byTingkat[r.tingkat] = {}
      if (!byTingkat[r.tingkat][r.jurusan_id]) {
        byTingkat[r.tingkat][r.jurusan_id] = { nama: r.jurusan_nama, rows: [] }
      }
      byTingkat[r.tingkat][r.jurusan_id].rows.push(r)
    })
    return Object.keys(byTingkat)
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: byTingkat[k] }), {})
  })

  const fillAllForTingkat = (tingkat, patch) => {
    subjectRows.value.filter((r) => r.tingkat === tingkat).forEach((r) => Object.assign(r, patch))
  }

  const fillAllForJurusan = (jurusanId, patch, tingkat = null) => {
    subjectRows.value
      .filter((r) => r.jurusan_id === jurusanId && (!tingkat || r.tingkat === tingkat))
      .forEach((r) => Object.assign(r, patch))
  }

  const getEndTime = (row) => calcEndTime(row.jam_mulai, row.durasi_menit)

  const buildAssignRows = () => {
    const filled = subjectRows.value.filter((r) => r.tanggal && r.jam_mulai)
    assignRows.value = filled.map((r) => ({
      ...r,
      _assignKey: r._key,
      details: buildDetailsForRow(r, classes.value),
    }))
  }

  const assignAutoPerRow = (rowIdx) => {
    const row = assignRows.value[rowIdx]
    if (!row) return
    const activeTeachers = teachers.value.filter((t) => t.status === 'AKTIF')
    row.details = autoAssignPengawas(row.details, activeTeachers, 2)
  }

  const assignAutoAll = () => {
    const activeTeachers = teachers.value.filter((t) => t.status === 'AKTIF')
    assignRows.value.forEach((row) => {
      row.details = autoAssignPengawas(row.details, activeTeachers, 2)
    })
  }

  const save = async () => {
    if (assignRows.value.length === 0) {
      $q.notify({ type: 'warning', message: 'Belum ada jadwal terisi' })
      return { success: false }
    }
    const jt = examTypes.value.find((t) => t.id === context.value.jenis_ujian_id)
    const payload = assignRows.value.map((r) => ({
      tingkat: r.tingkat,
      tanggal: r.tanggal,
      jam_mulai: r.jam_mulai,
      durasi_menit: r.durasi_menit,
      subject_id: r.subject_id,
      subject_kode: r.subject_kode,
      subject_nama: r.subject_nama,
      kelompok: r.kelompok,
      jurusan_id: r.jurusan_id || null,
      jenis_ujian_id: context.value.jenis_ujian_id,
      jenis_ujian_kode: jt?.kode || null,
      academic_year: context.value.academic_year,
      semester: context.value.semester,
      details: r.details || [],
    }))
    saving.value = true
    try {
      const res = await ExamScheduleService.createBatch(payload)
      const count = res.data?.created || payload.length
      $q.notify({ type: 'positive', message: `${count} jadwal berhasil disimpan` })
      return { success: true, count }
    } catch (e) {
      $q.notify({ type: 'negative', message: `Gagal menyimpan jadwal \n ${e}` })
      return { success: false }
    } finally {
      saving.value = false
    }
  }

  const reset = () => {
    subjectRows.value = []
    assignRows.value = []
  }

  return {
    context,
    subjectRows,
    assignRows,
    loadingRefs,
    examTypeOptions,
    semesterOptions,
    academicYearOptions,
    teacherOptions,
    ruangOptionsAll,
    saving,
    wajibRows,
    kejuruanRows,
    groupedWajibByTingkat,
    groupedKejuruanByTingkat,
    hasMajor,
    loadReferenceData,
    buildSubjectRows,
    fillAllForTingkat,
    fillAllForJurusan,
    getEndTime,
    buildAssignRows,
    assignAutoPerRow,
    assignAutoAll,
    save,
    reset,
    teachers,
  }
}
