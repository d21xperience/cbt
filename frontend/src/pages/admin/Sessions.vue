<!-- src/pages/admin/Sessions.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h4 col">
        <q-icon name="event" color="primary" size="md" class="q-mr-sm" />
        Sesi Ujian
      </div>
      <q-btn color="primary" icon="add" label="Buat Sesi Baru" @click="openCreateDialog" />
    </div>

    <!-- Filter -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row q-gutter-md">
          <q-select v-model="filter.status" :options="statusOptions" label="Filter Status" outlined dense emit-value
            map-options clearable class="col" />
          <q-select v-model="filter.session_type" :options="typeOptions" label="Filter Tipe" outlined dense emit-value
            map-options clearable class="col" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card>
      <q-table :rows="filteredSessions" :columns="columns" row-key="id" flat bordered :loading="loading"
        no-data-label="Belum ada sesi ujian">
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.row.status)" :label="props.row.status" />
          </q-td>
        </template>

        <template v-slot:body-cell-session_type="props">
          <q-td :props="props">
            <q-badge :color="props.row.session_type === 'REGULER' ? 'primary' : 'orange'"
              :label="props.row.session_type" outline />
          </q-td>
        </template>

        <template v-slot:body-cell-time="props">
          <q-td :props="props">
            <div>{{ formatDateTime(props.row.start_time) }}</div>
            <div class="text-caption text-grey">s/d {{ formatDateTime(props.row.end_time) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)"
              :disable="props.row.status === 'ACTIVE'">
              <q-tooltip>Hapus sesi</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Buat Sesi -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 500px;">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Buat Sesi Ujian Baru</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="onCreateSession" class="q-gutter-md">
            <q-select v-model="newSession.exam_id" :options="examOptions" label="Ujian" outlined emit-value map-options
              :rules="[val => !!val || 'Ujian wajib dipilih']" />

            <q-select v-model="newSession.session_type" :options="typeOptions" label="Tipe Sesi" outlined emit-value
              map-options :rules="[val => !!val || 'Tipe sesi wajib dipilih']" />

            <q-input v-model="newSession.start_time" label="Waktu Mulai" type="datetime-local" outlined
              :rules="[val => !!val || 'Waktu mulai wajib diisi']" />

            <q-input v-model="newSession.end_time" label="Waktu Selesai" type="datetime-local" outlined
              :rules="[val => !!val || 'Waktu selesai wajib diisi']" />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Batal" color="grey" v-close-popup />
          <q-btn label="Buat Sesi" color="primary" :loading="creating" @click="onCreateSession" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from '@/stores/admin/dashboard'

const $q = useQuasar()
const adminStore = useAdminStore()
const loading = ref(false)
const creating = ref(false)
const showCreateDialog = ref(false)

const filter = reactive({
  status: null,
  session_type: null
})

const newSession = reactive({
  exam_id: '',
  session_type: '',
  start_time: '',
  end_time: ''
})

const statusOptions = [
  { label: 'Terjadwal', value: 'SCHEDULED' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Selesai', value: 'COMPLETED' }
]

const typeOptions = [
  { label: 'Reguler', value: 'REGULER' },
  { label: 'Susulan', value: 'SUSULAN' }
]

const columns = [
  { name: 'exam_name', label: 'Ujian', field: 'exam_name', align: 'left' },
  { name: 'session_type', label: 'Kelas', field: 'session_type', align: 'center' },
  { name: 'session_type', label: 'Tipe', field: 'session_type', align: 'center' },
  { name: 'time', label: 'Waktu', field: 'time', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'participant_count', label: 'Peserta', field: 'participant_count', align: 'center' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'center' }
]

const filteredSessions = computed(() => {
  return adminStore.sessions.filter(s => {
    if (filter.status && s.status !== filter.status) return false
    if (filter.session_type && s.session_type !== filter.session_type) return false
    return true
  })
})

const examOptions = computed(() =>
  adminStore.exams.map(e => ({ label: e.name, value: e.id }))
)

const getStatusColor = (status) => {
  const colors = {
    SCHEDULED: 'blue',
    ACTIVE: 'positive',
    COMPLETED: 'grey'
  }
  return colors[status] || 'grey'
}

const formatDateTime = (iso) => {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const openCreateDialog = () => {
  // Reset form
  newSession.exam_id = ''
  newSession.session_type = ''
  newSession.start_time = ''
  newSession.end_time = ''
  showCreateDialog.value = true
}

const onCreateSession = async () => {
  // Validasi waktu
  if (new Date(newSession.end_time) <= new Date(newSession.start_time)) {
    $q.notify({
      type: 'negative',
      message: 'Waktu selesai harus lebih besar dari waktu mulai'
    })
    return
  }

  creating.value = true
  try {
    await adminStore.createSession({
      exam_id: newSession.exam_id,
      session_type: newSession.session_type,
      start_time: new Date(newSession.start_time).toISOString(),
      end_time: new Date(newSession.end_time).toISOString()
    })

    showCreateDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'Sesi ujian berhasil dibuat'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Gagal membuat sesi'
    })
  } finally {
    creating.value = false
  }
}

const confirmDelete = (session) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus sesi ujian <b>${session.exam_name}</b>?<br>Tindakan ini tidak dapat dibatalkan.`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Ya, Hapus', color: 'negative', flat: true },
    persistent: true
  }).onOk(async () => {
    try {
      await adminStore.deleteSession(session.id)
      $q.notify({ type: 'positive', message: 'Sesi berhasil dihapus' })
    } catch {
      $q.notify({ type: 'negative', message: 'Gagal menghapus sesi' })
    }
  })
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      adminStore.fetchSessions(),
      adminStore.fetchExams()
    ])
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal memuat data' })
  } finally {
    loading.value = false
  }
})
</script>
