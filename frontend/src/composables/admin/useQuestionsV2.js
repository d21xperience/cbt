// src/composables/admin/useQuestionsV2.js
//
// Composable: state machine Kelola Soal V2.
// Responsibility:
//   - examTypeId (persist LocalStorage)
//   - tingkat + classId
//   - subjects table (status soal per mapel)
//   - find-or-create exam per mapel

import { ref, computed, onMounted } from 'vue'
import { LocalStorage } from 'quasar'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { SubjectService } from '@/services/admin/SubjectService'
import { ClassService } from '@/services/admin/ClassService'
import { ExamService } from '@/services/admin/ExamService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { getGradeOptionsForJenjang } from '@/domain/school/jenjang'

const LS_EXAM_TYPE = 'cbt_exam_type_id'

export function useQuestionsV2() {
  // ── State
  const loading = ref(false)
  const errorState = ref(null)

  const examTypes = ref([])
  const examTypeId = ref(LocalStorage.getItem(LS_EXAM_TYPE) || null)

  const subjects = ref([])
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
    if (!tingkat.value) return []
    return classes.value.filter((c) => c.tingkat === tingkat.value)
  })

  const classOptions = computed(() =>
    filteredClasses.value.map((c) => ({
      label: c.nama,
      value: c.id,
    })),
  )

  const selectedClass = computed(() => classes.value.find((c) => c.id === classId.value))

  /**
   * Table mapel: subjects untuk tingkat terpilih.
   * + status soal (dari exams yang existing)
   * + guru pengampu (dari Lessons — TODO wire)
   */
  const subjectTable = computed(() => {
    if (!tingkat.value || !classId.value) return []

    const cls = selectedClass.value
    const jurusanId = cls?.program_keahlian_id || null

    // Filter subjects by tingkat
    const list = subjects.value.filter((s) => s.tingkat === tingkat.value)

    // Filter KEJURUAN by jurusan kelas
    const filtered = list.filter((s) => {
      if (s.kelompok !== 'KEJURUAN') return true
      if (!jurusanId) return false
      return s.jurusan_id === jurusanId
    })

    // Enrich dengan status exam
    return filtered.map((s) => {
      const exam = exams.value.find((e) => e.subject_id === s.id && e.class_id === classId.value)
      return {
        ...s,
        exam_id: exam?.id || null,
        total_questions: exam?.total_questions || 0,
        has_questions: (exam?.total_questions || 0) > 0,
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
      // Filter: SUSULAN tidak ditampilkan di picker (kelola via menu terpisah)
      examTypes.value = list.filter((t) => t.kode !== 'SUSULAN')
    } catch (err) {
      console.warn('[useQuestionsV2] loadExamTypes failed:', err?.message)
    }
  }

  const loadContext = async () => {
    try {
      const [subRes, clsRes, progRes, schoolRes] = await Promise.all([
        SubjectService.list(),
        ClassService.list(),
        ProgramKeahlianService.getAssignedPrograms(),
        SchoolProfileService.getProfile().catch(() => null),
      ])
      subjects.value = Array.isArray(subRes?.data?.data) ? subRes.data.data : []
      classes.value = Array.isArray(clsRes?.data?.data) ? clsRes.data.data : []
      programs.value = Array.isArray(progRes?.data?.data) ? progRes.data.data : []
      const school = schoolRes?.data?.data ?? schoolRes?.data ?? {}
      schoolJenjang.value = school.jenjang || null
      programDurationYears.value = Number(school.program_duration_years) || 3

      // Auto-set tingkat default ke opsi pertama
      if (!tingkat.value && tingkatOptions.value.length > 0) {
        tingkat.value = tingkatOptions.value[0].value
      }
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

  return {
    // state
    loading,
    errorState,
    examTypes,
    examTypeId,
    subjects,
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
