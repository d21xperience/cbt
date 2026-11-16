// src/composables/admin/useQuestionsV2.js
//
// Composable: state machine Kelola Soal V2.
// Responsibility:
//   - examTypeId (persist LocalStorage)
//   - tingkat + classId
//   - subjects table (status soal per mapel)
//   - find-or-create exam per mapel

import { ref, computed, onMounted, watch } from 'vue'
import { useAcademicStore } from '@/stores/academic'
import { LessonService } from '@/services/admin/LessonService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { ExamService } from '@/services/admin/ExamService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { getGradeOptionsForJenjang } from '@/domain/school/jenjang'
import { LocalStorage } from 'quasar'

const LS_EXAM_TYPE = 'cbt_exam_type_id'

export function useQuestionsV2() {
  const academicStore = useAcademicStore()
  // ── State
  const loading = ref(false)
  const errorState = ref(null)

  const examTypes = ref([])
  const examTypeId = ref(null)

  const lessons = ref([])
  const classes = ref([])
  const exams = ref([]) // exam existing per kelas
  const programs = ref([])

  const schoolJenjang = ref(null)
  const programDurationYears = ref(3)

  const tingkat = ref(null)
  const classId = ref(null)

  const examTypePickerOpen = ref(false)

  // ── Computed
  const selectedExamType = computed(() => examTypes.value.find((t) => t.id === examTypeId.value))

  const isVocational = computed(() => {
    const j = String(schoolJenjang.value || '').toUpperCase()
    return j === 'SMK' || j === 'MAK'
  })

  const tingkatOptions = computed(() =>
    getGradeOptionsForJenjang(schoolJenjang.value, programDurationYears.value),
  )

  const filteredClasses = computed(() => {
    // Karena data dari lessons, kita tampilkan semua kelas unik
    return classes.value
  })

  const classOptions = computed(() =>
    filteredClasses.value.map((c) => ({
      label: c.nama, // Atau c.class_nama
      value: c.id,   // Atau c.class_id
    })),
  )

  const selectedClass = computed(() => classes.value.find((c) => c.id === classId.value))

  /**
   * Table mapel: subjects untuk tingkat terpilih.
   * + status soal (dari exams yang existing)
   * + guru pengampu (dari Lessons — TODO wire)
   */
  const subjectTable = computed(() => {
    if (!classId.value) return []

    // Filter lessons berdasarkan kelas yang dipilih
    const filtered = lessons.value.filter((l) => l.class_id === classId.value)

    // Map ke format yang diminta tabel UI
    return filtered.map((l) => {
      const exam = exams.value.find(
        (e) => e.subject_id === l.subject_id && e.class_id === l.class_id,
      )
      return {
        id: l.subject_id, // Kompatibilitas UI lama
        subject_id: l.subject_id, // ID untuk FindOrCreate
        class_id: l.class_id,
        kode: l.subject_kode || '-',
        nama: l.subject_nama || '-',
        kelompok: 'UMUM', // Default, karena lesson tidak bawa kelompok
        exam_id: exam?.id || l.exam_id || null,
        total_questions: exam?.total_questions || l.total_questions || 0,
        has_questions: (exam?.total_questions || l.total_questions || 0) > 0,
      }
    })
  })

  const stats = computed(() => {
    const total = subjectTable.value.length
    const withQ = subjectTable.value.filter((s) => s.has_questions).length
    return { total, withQ, withoutQ: total - withQ }
  })

  // ── Actions
  const loadExamTypes = async () => {
    try {
      const res = await ExamTypeService.list()
      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      examTypes.value = list.filter((t) => t.kode !== 'SUSULAN')

      // ✅ FIX RACE CONDITION: Cocokkan mode (UAS/UTS) SETELAH data API masuk
      if (academicStore.exam_mode) {
        const found = examTypes.value.find(t => t.kode === academicStore.exam_mode || t.nama?.includes(academicStore.exam_mode))
        if (found) {
          examTypeId.value = found.id
        }
      }
    } catch (err) {
      console.warn('[useQuestionsV2] loadExamTypes failed:', err?.message)
    }
  }

  const loadContext = async () => {
    try {
      const [lesRes, progRes, schoolRes] = await Promise.all([
        LessonService.list({ academic_period_id: academicStore.active_period_id }),
        ProgramKeahlianService.getAssignedPrograms(),
        SchoolProfileService.getProfile().catch(() => null),
      ])
      lessons.value = Array.isArray(lesRes?.data?.data) ? lesRes.data.data : []
      programs.value = Array.isArray(progRes?.data?.data) ? progRes.data.data : []
      const school = schoolRes?.data?.data ?? schoolRes?.data ?? {}
      schoolJenjang.value = school.jenjang || null
      programDurationYears.value = Number(school.program_duration_years) || 3

      // Karena kita menggunakan Lessons, kita bisa langsung mengekstrak daftar kelas unik dari Lessons
      const uniqueClasses = new Map()
      lessons.value.forEach((l) => {
        if (!uniqueClasses.has(l.class_id)) {
          uniqueClasses.set(l.class_id, { id: l.class_id, nama: l.class_nama })
        }
      })
      classes.value = Array.from(uniqueClasses.values())
    } catch (err) {
      console.warn('[useQuestionsV2] loadContext failed:', err?.message)
    }
  }

  const loadExamsForClass = async () => {
    if (!classId.value) {
      exams.value = []
      return
    }
    try {
      const res = await ExamService.listByClass({
        class_id: classId.value,
        jenis_ujian_id: examTypeId.value,
        academic_period_id: academicStore.active_period_id,
      })
      exams.value = Array.isArray(res?.data?.data) ? res.data.data : []
    } catch (err) {
      console.warn('[useQuestionsV2] loadExamsForClass failed:', err?.message)
      exams.value = []
    }
  }

  const selectExamType = (id) => {
    examTypeId.value = id
    LocalStorage.set(LS_EXAM_TYPE, id)
    examTypePickerOpen.value = false

    // Reset sub-selection saat ganti jenis
    classId.value = null

    if (classId.value) loadExamsForClass()
  }

  const changeExamType = () => {
    examTypePickerOpen.value = true
  }

  const onTingkatChange = () => {
    classId.value = null
    exams.value = []
  }

  const onClassChange = () => {
    loadExamsForClass()
  }

  const load = async () => {
    loading.value = true
    errorState.value = null
    try {
      await Promise.all([loadExamTypes(), loadContext()])
      if (examTypeId.value && classId.value) {
        await loadExamsForClass()
      }
    } catch (err) {
      errorState.value = 'server_error'
      console.warn('[useQuestionsV2] load failed:', err?.message)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  // Sync Jenis Ujian (UAS/UTS) dari Global Store
  watch(
    () => academicStore.exam_mode,
    (newMode) => {
      if (newMode && examTypes.value.length > 0) {
        const found = examTypes.value.find((t) => t.kode === newMode || t.nama?.includes(newMode))
        if (found) {
          examTypeId.value = found.id
          if (classId.value) loadExamsForClass()
        }
      }
    },
    { immediate: true },
  )

  // Sync Tahun Ajaran
  watch(
    () => academicStore.active_period_id,
    () => {
      load()
    },
  )

  return {
    // state
    loading,
    errorState,
    examTypes,
    examTypeId,
    // subjects,
    classes,
    programs,
    exams,
    schoolJenjang,
    // selection
    tingkat,
    classId,
    // dialog
    examTypePickerOpen,
    // computed
    selectedExamType,
    isVocational,
    tingkatOptions,
    classOptions,
    selectedClass,
    subjectTable,
    stats,
    // actions
    load,
    loadExamsForClass,
    selectExamType,
    changeExamType,
    onTingkatChange,
    onClassChange,
  }
}
