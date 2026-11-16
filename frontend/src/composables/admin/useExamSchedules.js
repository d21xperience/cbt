import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { LessonService } from '@/services/admin/LessonService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { TeacherService } from '@/services/admin/TeacherService'
import { RoomService } from '@/services/admin/RoomService'
import { useAcademicStore } from '@/stores/academic'

export function useExamSchedules() {
  const $q = useQuasar()
  const academicStore = useAcademicStore()

  const schedules = ref([])
  const lessons = ref([])
  const examTypes = ref([])
  const teachers = ref([])
  const rooms = ref([])
  const loading = ref(false)

  const teacherOptions = computed(() => teachers.value.map((t) => ({ label: t.nama, value: t.id })))
  const roomOptions = computed(() => rooms.value.map((r) => ({ label: r.nama, value: r.id })))
  const lessonOptions = computed(() =>
    lessons.value.map((l) => ({
      label: `${l.subject_nama} - ${l.class_nama} (Guru: ${l.teacher_nama})`,
      value: l.id,
    })),
  )

  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const initialForm = ref({})
  const submitting = ref(false)

  const loadData = async () => {
    loading.value = true
    try {
      const [schRes, lsRes, etRes, tchRes, rmRes] = await Promise.all([
        ExamScheduleService.list({ academic_period_id: academicStore.active_period_id }),
        LessonService.list(),
        ExamTypeService.list(),
        TeacherService.list(),
        RoomService.list(),
      ])
      schedules.value = schRes.data?.data || []
      lessons.value = lsRes.data?.data || []
      examTypes.value = etRes.data?.data || []
      teachers.value = tchRes.data?.data || []
      rooms.value = rmRes.data?.data || []
    } catch (err) {
      $q.notify({ type: 'negative', message: `Gagal memuat data referensi ${err}` })
    } finally {
      loading.value = false
    }
  }

  // Watch Global Context (Tahun/Semester) untuk reload
  watch(() => [academicStore.academic_year, academicStore.semester], () => {
    loadData()
  })

  const openCreateDialog = (row = null) => {
    if (!academicStore.exam_mode) {
      $q.notify({ type: 'warning', message: 'Aktifkan Mode Ujian (UTS/UAS) di Header terlebih dahulu.' })
      return
    }
    isEditing.value = false
    if (row) {
      initialForm.value = { lesson_id: row.lesson_id, status: 'DRAFT', durasi_menit: 90 }
    } else {
      initialForm.value = { status: 'DRAFT', durasi_menit: 90 }
    }
    dialogOpen.value = true
  }

  const openEditDialog = (row) => {
    isEditing.value = true
    initialForm.value = { ...row }
    dialogOpen.value = true
  }

  const closeDialog = () => {
    dialogOpen.value = false
  }

  const submitForm = async (payload) => {
    submitting.value = true
    try {
      // Inject Jenis Ujian ID berdasarkan Mode Ujian Global
      const type = examTypes.value.find(t => t.kode === academicStore.exam_mode)
      if (!type) {
        $q.notify({ type: 'negative', message: `Jenis ujian '${academicStore.exam_mode}' tidak ditemukan.` })
        return { success: false }
      }
      
      const finalPayload = { ...payload, jenis_ujian_id: type.id }

      if (isEditing.value) {
        await ExamScheduleService.update(finalPayload.id, finalPayload)
        $q.notify({ type: 'positive', message: 'Jadwal diperbarui.' })
      } else {
        await ExamScheduleService.create(finalPayload)
        $q.notify({ type: 'positive', message: 'Jadwal dibuat.' })
      }
      await loadData()
      closeDialog()
      return { success: true }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'Gagal menyimpan jadwal.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  const deleteSchedule = async (row) => {
    try {
      await ExamScheduleService.remove(row.id)
      $q.notify({ type: 'positive', message: 'Jadwal dihapus.' })
      await loadData()
    } catch (err) {
      $q.notify({ type: 'negative', message: `Gagal menghapus jadwal. ${err}` })
    }
  }

  onMounted(loadData)

  return {
    schedules,
    loading,
    lessonOptions,
    teacherOptions,
    roomOptions,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    submitForm,
    deleteSchedule,
  }
}
