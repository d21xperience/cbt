<!-- src/pages/exam/ExamSchedule.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Jadwal Ujian</div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
      <div class="text-caption text-grey-7 q-mt-sm">Memuat jadwal...</div>
    </div>

    <!-- Empty -->
    <div v-else-if="exams.length === 0" class="text-center q-pa-xl text-grey-6">
      <q-icon name="event_busy" size="xl" />
      <div class="q-mt-sm">Belum ada jadwal ujian.</div>
    </div>

    <!-- Table -->
    <q-table v-else :rows="exams" :columns="columns" row-key="session_id" :filter="filter" flat bordered
      :pagination="{ rowsPerPage: 10 }">
      <template v-slot:top-right>
        <q-input v-model="filter" dense outlined debounce="200" placeholder="Cari mapel" clearable>
          <template v-slot:prepend><q-icon name="search" /></template>
        </q-input>
      </template>

      <template v-slot:body-cell-date="props">
        <q-td :props="props">
          <div>{{ formatRelativeExamDate(props.row.start_time) }}</div>
          <div class="text-caption text-grey-6">
            {{ props.row.jam_mulai }} – {{ endTimeOf(props.row) }}
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-badge :color="statusOf(props.row).color">
            {{ statusOf(props.row).label }}
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-action="props">
        <q-td :props="props" class="text-center">
          <q-btn :label="accessOf(props.row).canEnter ? 'Masuk' : 'Lihat'"
            :color="accessOf(props.row).canEnter ? 'primary' : 'grey-7'" :disable="!accessOf(props.row).canEnter"
            :icon="accessOf(props.row).canEnter ? 'login' : 'lock_clock'" size="sm" no-caps
            @click="handleExamAction(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useExamScheduleStore } from '@/stores/exam/examSchedule'
import {
  formatRelativeExamDate,
  getExamAccessState,
  getExamStatusLabel,
} from '@/utils/exam/dateHelpers'

const $q = useQuasar()
const router = useRouter()
const store = useExamScheduleStore()

const filter = ref('')
const loading = ref(false)

const exams = computed(() => store.scheduleList || [])

const columns = [
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'title', align: 'left', sortable: true },
  // { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left' },
  // { name: 'ruang_nama', label: 'Ruang', field: 'ruang_nama', align: 'left' },
  { name: 'date', label: 'Tanggal & Waktu', field: 'start_time', align: 'left' },
  { name: 'status', label: 'Status', align: 'center' },
  { name: 'action', label: 'Aksi', align: 'center' },
]

const accessOf = (exam) => getExamAccessState(exam)
const statusOf = (exam) => getExamStatusLabel(exam)

const endTimeOf = (exam) => {
  if (!exam?.end_time) return '-'
  const d = new Date(exam.end_time)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const handleExamAction = (exam) => {
  const { canEnter, reason } = accessOf(exam)
  if (!canEnter) {
    const msgs = {
      too_early: 'Ujian belum dibuka.',
      expired: 'Waktu ujian sudah lewat.',
      no_schedule: 'Jadwal tidak valid.',
    }
    $q.notify({ type: 'warning', message: msgs[reason] || 'Tidak dapat diakses.' })
    return
  }
  store.setCurrentExam(exam.session_id, exam.subject_nama)
  router.push({ name: 'exam-preparation', query: { examId: exam.session_id } })
}

onMounted(async () => {
  loading.value = true
  try {
    await store.fetchSchedule()
  } finally {
    loading.value = false
  }
})
</script>
