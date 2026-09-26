// src/composables/admin/useExamWizard.js
//
// Composable: 4-step wizard untuk pilih/buat ujian.
// Responsibility:
//   - state wizard: step, form fields
//   - load refs: exam-types, subjects, programs, school context
//   - auto-generate judul + duplicate handling
//   - find-or-create exam

import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ExamService } from '@/services/admin/ExamService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { SubjectService } from '@/services/admin/SubjectService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { useAuthStore } from '@/stores/auth'
import { useProctorProfile } from '@/composables/proctor/useProctorProfile'

const CURRENT_ACADEMIC_YEAR = '2025/2026'

export function useExamWizard() {
  const $q = useQuasar()
  const authStore = useAuthStore()
  const { fetchProfile, teachingSubjects } = useProctorProfile()

  // ── Wizard state
  const dialogOpen = ref(false)
  const step = ref(1) // 1..4
  const submitting = ref(false)

  // ── Form fields
  const form = ref({
    tingkat: '',
    jurusan_id: null,
    subject_id: null,
    jenis_ujian_id: null,
    academic_year: CURRENT_ACADEMIC_YEAR,
    semester: 'GANJIL',
    custom_nama: '', // override
  })

  // ── Refs data
  const examTypes = ref([])
  const subjects = ref([])
  const programs = ref([])
  const schoolJenjang = ref(null)
  const programDurationYears = ref(3)
  const loadingRefs = ref(false)

  // ── Role
  const userRole = computed(() =>
    String(authStore.role || authStore.user?.role || '').toUpperCase(),
  )
  const isProctorRole = computed(() => ['PROCTOR', 'TEACHER'].includes(userRole.value))

  // ── Tingkat options (by jenjang)
  const tingkatOptions = computed(() => {
    const j = String(schoolJenjang.value || '').toUpperCase()
    const build = (start, end) => {
      const out = []
      for (let i = start; i <= end; i++) {
        out.push({ label: `Kelas ${i}`, value: String(i) })
      }
      return out
    }
    if (j === 'SMP' || j === 'MTs') return build(7, 9)
    if (j === 'SMA' || j === 'MA') return build(10, 12)
    if (j === 'SMK' || j === 'MAK') {
      const dur = Number(programDurationYears.value) || 3
      return build(10, 10 + dur - 1)
    }
    return build(10, 12)
  })

  const isVocational = computed(() => {
    const j = String(schoolJenjang.value || '').toUpperCase()
    return j === 'SMK' || j === 'MAK'
  })

  // ── Mapel options (proctor filter)
  const subjectOptions = computed(() => {
    const list = subjects.value
    if (!isProctorRole.value) {
      return list.map((s) => ({ label: `${s.kode} — ${s.nama}`, value: s.id }))
    }
    // Proctor: filter by teaching_subjects
    const mySubjects = teachingSubjects.value.map((s) => String(s.name || '').toLowerCase())
    const filtered = list.filter((s) =>
      mySubjects.some(
        (n) =>
          String(s.nama || '')
            .toLowerCase()
            .includes(n) || n.includes(String(s.nama || '').toLowerCase()),
      ),
    )
    return filtered.map((s) => ({ label: `${s.kode} — ${s.nama}`, value: s.id }))
  })

  const jurusanOptions = computed(() =>
    programs.value.map((p) => ({ label: p.nama || p.kode, value: p.id })),
  )

  const examTypeOptions = computed(() =>
    examTypes.value.map((t) => ({ label: `${t.kode} — ${t.nama}`, value: t.id })),
  )

  const semesterOptions = [
    { label: 'Ganjil', value: 'GANJIL' },
    { label: 'Genap', value: 'GENAP' },
  ]

  // ── Lookup helpers
  const findExamType = (id) => examTypes.value.find((t) => t.id === id)
  const findSubject = (id) => subjects.value.find((s) => s.id === id)
  const findProgram = (id) => programs.value.find((p) => p.id === id)

  // ── Auto-generated judul
  const generatedNama = computed(() => {
    const jt = findExamType(form.value.jenis_ujian_id)
    const subj = findSubject(form.value.subject_id)
    const prog = findProgram(form.value.jurusan_id)

    if (!jt || !subj || !form.value.tingkat) return ''

    const parts = [jt.kode, subj.nama]
    let tail = form.value.tingkat
    if (isVocational.value && prog) {
      tail += `-${prog.kode || prog.nama}`
    }
    parts.push(tail)
    return parts.join(' ')
  })

  const effectiveNama = computed(() => {
    const custom = String(form.value.custom_nama || '').trim()
    return custom || generatedNama.value
  })

  // ── Step validation
  const canNextStep1 = computed(() => !!form.value.tingkat)
  const canNextStep2 = computed(() => !isVocational.value || !!form.value.jurusan_id)
  const canNextStep3 = computed(() => !!form.value.subject_id)
  const canSubmit = computed(() => {
    if (!form.value.jenis_ujian_id) return false
    if (!form.value.academic_year?.trim()) return false
    if (!form.value.semester) return false
    if (!effectiveNama.value) return false
    return true
  })

  // ── Load refs
  const loadRefs = async () => {
    loadingRefs.value = true
    try {
      // Fetch proctor profile jika role proctor
      if (isProctorRole.value) {
        await fetchProfile()
      }
      const [exTypeRes, subjRes, progRes, schoolRes] = await Promise.all([
        ExamTypeService.list(),
        SubjectService.list(),
        ProgramKeahlianService.getAssignedPrograms(),
        SchoolProfileService.getProfile().catch(() => null),
      ])
      examTypes.value = Array.isArray(exTypeRes?.data?.data) ? exTypeRes.data.data : []
      subjects.value = Array.isArray(subjRes?.data?.data) ? subjRes.data.data : []
      programs.value = Array.isArray(progRes?.data?.data) ? progRes.data.data : []
      const school = schoolRes?.data?.data ?? schoolRes?.data ?? {}
      schoolJenjang.value = school.jenjang || null
      programDurationYears.value = Number(school.program_duration_years) || 3
    } catch (err) {
      console.warn('[useExamWizard] loadRefs failed:', err?.message)
      $q.notify({ type: 'negative', message: 'Gagal memuat data referensi.' })
    } finally {
      loadingRefs.value = false
    }
  }

  // ── Wizard controls
  const openDialog = async () => {
    // reset
    step.value = 1
    form.value = {
      tingkat: '',
      jurusan_id: null,
      subject_id: null,
      jenis_ujian_id: null,
      academic_year: CURRENT_ACADEMIC_YEAR,
      semester: 'GANJIL',
      custom_nama: '',
    }
    dialogOpen.value = true
    if (examTypes.value.length === 0) {
      await loadRefs()
    }
  }

  const closeDialog = () => {
    dialogOpen.value = false
  }

  const nextStep = () => {
    if (step.value === 1 && !canNextStep1.value) return
    if (step.value === 2 && !canNextStep2.value) return
    if (step.value === 3 && !canNextStep3.value) return

    // Auto-skip step 2 untuk SMA/MA
    if (step.value === 1 && !isVocational.value) {
      step.value = 3
      return
    }
    if (step.value < 4) step.value += 1
  }

  const prevStep = () => {
    if (step.value === 3 && !isVocational.value) {
      step.value = 1
      return
    }
    if (step.value > 1) step.value -= 1
  }

  const resetCustomNama = () => {
    form.value.custom_nama = ''
  }

  // ── Submit (find or create)
  const submitWizard = async () => {
    if (!canSubmit.value) return { success: false }
    submitting.value = true
    try {
      const payload = {
        jenis_ujian_id: form.value.jenis_ujian_id,
        subject_id: form.value.subject_id,
        tingkat: form.value.tingkat,
        jurusan_id: isVocational.value ? form.value.jurusan_id : null,
        academic_year: form.value.academic_year,
        semester: form.value.semester,
        custom_nama: form.value.custom_nama?.trim() || null,
      }
      const res = await ExamService.findOrCreate(payload)
      const exam = res?.data?.data
      const created = res?.data?.created

      $q.notify({
        type: 'positive',
        message: created
          ? `Ujian "${exam?.nama}" berhasil dibuat.`
          : `Ujian "${exam?.nama}" ditemukan (existing).`,
      })
      closeDialog()
      return { success: true, exam, created }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message:
          err?.response?.data?.message || err?.response?.data?.error || 'Gagal memproses ujian.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    // Lazy load — tidak fetch saat mount, hanya saat dialog dibuka
  })

  return {
    // state
    dialogOpen,
    step,
    submitting,
    loadingRefs,
    form,
    // refs
    examTypes,
    subjects,
    programs,
    schoolJenjang,
    // computed
    isVocational,
    isProctorRole,
    tingkatOptions,
    subjectOptions,
    jurusanOptions,
    examTypeOptions,
    semesterOptions,
    generatedNama,
    effectiveNama,
    // step validation
    canNextStep1,
    canNextStep2,
    canNextStep3,
    canSubmit,
    // actions
    loadRefs,
    openDialog,
    closeDialog,
    nextStep,
    prevStep,
    resetCustomNama,
    submitWizard,
  }
}
