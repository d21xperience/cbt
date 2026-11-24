// src/composables/admin/useQuestionsV2.js
// REVISI: Grouping mapel per tingkat + logika "Semua Kelas"

import { ref, computed, onMounted, watch } from 'vue'
import { useAcademicStore } from '@/stores/academic'
import { LessonService } from '@/services/admin/LessonService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { ClassService } from '@/services/admin/ClassService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'
import { LocalStorage } from 'quasar'

const LS_EXAM_TYPE = 'cbt_exam_type_id'

export function useQuestionsV2() {
  const academicStore = useAcademicStore()

  const loading = ref(false)
  const errorState = ref(null)
  const examTypes = ref([])
  const examTypeId = ref(null)
  const lessons = ref([])
  const subjects = ref([])
  const classes = ref([])
  const programs = ref([])
  const selectedTingkat = ref('all')
  const selectedClassId = ref(null)
  const examTypePickerOpen = ref(false)

  const selectedExamType = computed(() => examTypes.value.find((t) => t.id === examTypeId.value))

  const classOptions = computed(() => {
    let filtered = classes.value
    if (selectedTingkat.value !== 'all') {
      filtered = filtered.filter((c) => String(c.tingkat) === String(selectedTingkat.value))
    }
    return filtered
      .map((c) => ({ label: c.nama, value: c.id, tingkat: c.tingkat, jurusan_id: c.jurusan_id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  const selectedClass = computed(() => classes.value.find((c) => c.id === selectedClassId.value))

  const subjectTable = computed(() => {
    if (selectedTingkat.value === 'all' && !selectedClassId.value) return []

    // Peta kelas per tingkat (untuk cek "Semua Kelas")
    const classesByTingkat = {}
    classes.value.forEach((c) => {
      const t = String(c.tingkat || '-')
      if (!classesByTingkat[t]) classesByTingkat[t] = new Set()
      classesByTingkat[t].add(c.id)
    })

    let filteredLessons = lessons.value.filter(
      (l) => l.academic_period_id === academicStore.active_period_id,
    )

    if (selectedClassId.value) {
      filteredLessons = filteredLessons.filter((l) => l.class_id === selectedClassId.value)
    } else if (selectedTingkat.value !== 'all') {
      const classIdsInTingkat = classes.value
        .filter((c) => String(c.tingkat) === String(selectedTingkat.value))
        .map((c) => c.id)
      filteredLessons = filteredLessons.filter((l) => classIdsInTingkat.includes(l.class_id))
    }

    // Grouping: subject_id + tingkat
    const groups = {}
    filteredLessons.forEach((lesson) => {
      const cls = classes.value.find((c) => c.id === lesson.class_id) || {}
      const tingkat = String(cls.tingkat || '-')
      const key = `${lesson.subject_id}-${tingkat}`
      if (!groups[key]) {
        groups[key] = {
          id: key,
          subject_id: lesson.subject_id,
          tingkat: tingkat,
          class_ids: new Set(), // pakai Set untuk unique
          exam_id: null,
          total_questions: 0,
        }
      }
      if (cls.id) groups[key].class_ids.add(cls.id)
      if (lesson.exam_id) groups[key].exam_id = lesson.exam_id
      if (lesson.total_questions) groups[key].total_questions += lesson.total_questions
    })

    // Map ke format tabel
    return Object.values(groups)
      .map((group) => {
        const subject = subjects.value.find((s) => s.id === group.subject_id) || {}
        const totalKelasTingkat = (classesByTingkat[group.tingkat] || new Set()).size
        const kelasDipakai = group.class_ids.size
        let classLabel = ''

        if (totalKelasTingkat > 0 && kelasDipakai === totalKelasTingkat) {
          classLabel = 'Semua Kelas'
        } else {
          // Gabung nama kelas (urut abjad)
          const names = Array.from(group.class_ids)
            .map((id) => (classes.value.find((c) => c.id === id) || {}).nama || '-')
            .filter((n) => n !== '-')
            .sort((a, b) => a.localeCompare(b))
          classLabel = names.join(', ')
        }

        return {
          id: group.id,
          exam_id: group.exam_id,
          subject_id: group.subject_id,
          tingkat: group.tingkat,
          class_nama: classLabel,
          kode: subject.kode || '-',
          nama: subject.nama || '-',
          kelompok: subject.kelompok || 'UMUM',
          total_questions: group.total_questions,
          has_questions: group.total_questions > 0,
        }
      })
      .sort((a, b) => a.nama.localeCompare(b.nama))
  })

  const stats = computed(() => {
    const total = subjectTable.value.length
    const withQ = subjectTable.value.filter((s) => s.has_questions).length
    return { total, withQ, withoutQ: total - withQ }
  })

  const loadExamTypes = async () => {
    try {
      const res = await ExamTypeService.list()
      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      examTypes.value = list.filter((t) => t.kode !== 'SUSULAN')
      if (academicStore.exam_mode) {
        const found = examTypes.value.find(
          (t) => t.kode === academicStore.exam_mode || t.nama?.includes(academicStore.exam_mode),
        )
        if (found) examTypeId.value = found.id
      }
    } catch (err) {
      console.warn('[useQuestionsV2] loadExamTypes failed:', err?.message)
    }
  }

  const loadContext = async () => {
    try {
      const [lesRes, subRes, classRes, progRes] = await Promise.all([
        LessonService.list({ academic_period_id: academicStore.active_period_id }),
        import('@/services/admin/SubjectService').then((m) => m.SubjectService.list()),
        ClassService.list(),
        ProgramKeahlianService.getAssignedPrograms(),
      ])
      lessons.value = Array.isArray(lesRes?.data?.data) ? lesRes.data.data : []
      subjects.value = Array.isArray(subRes?.data?.data) ? subRes.data.data : []
      classes.value = Array.isArray(classRes?.data?.data) ? classRes.data.data : []
      programs.value = Array.isArray(progRes?.data?.data) ? progRes.data.data : []
    } catch (err) {
      console.warn('[useQuestionsV2] loadContext failed:', err?.message)
    }
  }

  const selectExamType = (id) => {
    examTypeId.value = id
    LocalStorage.set(LS_EXAM_TYPE, id)
    examTypePickerOpen.value = false
    selectedTingkat.value = 'all'
    selectedClassId.value = null
  }

  const changeExamType = () => {
    examTypePickerOpen.value = true
  }
  const selectTingkat = (t) => {
    selectedTingkat.value = t
    selectedClassId.value = null
  }
  const onClassChange = () => {}

  const load = async () => {
    loading.value = true
    errorState.value = null
    try {
      await Promise.all([loadExamTypes(), loadContext()])
      const savedExamType = LocalStorage.getItem(LS_EXAM_TYPE)
      if (savedExamType && examTypes.value.find((t) => t.id === savedExamType)) {
        examTypeId.value = savedExamType
      }
    } catch (err) {
      errorState.value = 'server_error'
      console.warn('[useQuestionsV2] load failed:', err?.message)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  watch(
    () => academicStore.exam_mode,
    (newMode) => {
      if (newMode && examTypes.value.length > 0) {
        const found = examTypes.value.find((t) => t.kode === newMode || t.nama?.includes(newMode))
        if (found) examTypeId.value = found.id
      }
    },
    { immediate: true },
  )

  watch(
    () => academicStore.active_period_id,
    () => {
      load()
    },
  )

  return {
    loading,
    errorState,
    examTypes,
    examTypeId,
    classOptions,
    selectedClass,
    selectedTingkat,
    selectedClassId,
    examTypePickerOpen,
    selectedExamType,
    subjectTable,
    stats,
    selectExamType,
    changeExamType,
    selectTingkat,
    onClassChange,
  }
}
