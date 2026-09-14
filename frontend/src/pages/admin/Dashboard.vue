<!-- src/pages/admin/Dashboard.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">
      <q-icon name="dashboard" color="primary" size="md" class="q-mr-sm" />
      Dashboard Admin
    </div>

    <!-- Statistik Cards (tetap sama) -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="bg-primary text-white">
            <div class="row items-center">
              <q-icon name="people" size="40px" />
              <div class="q-ml-md">
                <div class="text-h4">{{ adminStore.stats.totalParticipants }}</div>
                <div class="text-caption">Total Peserta</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="bg-teal text-white">
            <div class="row items-center">
              <q-icon name="quiz" size="40px" />
              <div class="q-ml-md">
                <div class="text-h4">{{ adminStore.stats.totalExams }}</div>
                <div class="text-caption">Total Ujian</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="bg-orange text-white">
            <div class="row items-center">
              <q-icon name="event_busy" size="40px" />
              <div class="q-ml-md">
                <div class="text-h4">{{ adminStore.stats.activeSessions }}</div>
                <div class="text-caption">Sesi Aktif</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="bg-positive text-white">
            <div class="row items-center">
              <q-icon name="check_circle" size="40px" />
              <div class="q-ml-md">
                <div class="text-h4">{{ adminStore.stats.completedExams }}</div>
                <div class="text-caption">Ujian Selesai</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Quick Actions -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Aksi Cepat</div>
        <div class="row q-gutter-md">
          <q-btn color="primary" icon="sync" label="Sync dari SIAKAD" :to="{ name: 'admin-sync' }" />
          <q-btn color="teal" icon="event" label="Kelola Sesi Ujian" :to="{ name: 'admin-sessions' }" />
          <q-btn color="grey" icon="upload_file" label="Upload Soal" disable />
          <q-btn color="grey" icon="group_add" label="Import Peserta" disable />

          <!-- 🔧 Tombol Reset Mock Data (hanya muncul di mock mode) -->
          <q-btn v-if="isMockMode" color="warning" icon="restart_alt" label="Reset Mock Data" @click="confirmResetMock">
            <q-tooltip>Reset semua data mock ke state awal (untuk testing)</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>

    <!-- Riwayat Sync Terakhir (tetap sama) -->
    <q-card>
      <q-card-section>
        <div class="text-h6 q-mb-md">Riwayat Sync Terakhir</div>
        <q-table :rows="adminStore.syncHistory" :columns="syncColumns" row-key="id" flat bordered dense
          :loading="loadingHistory" no-data-label="Belum ada riwayat sync">
          <template v-slot:body-cell-timestamp="props">
            <q-td :props="props">
              {{ formatDate(props.row.timestamp) }}
            </q-td>
          </template>
          <template v-slot:body-cell-synced_count="props">
            <q-td :props="props">
              <q-badge color="positive">{{ props.row.synced_count }} data</q-badge>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from '@/stores/admin/dashboard'
// import { resetMockData } from '@/mocks/mockInterceptor'

const $q = useQuasar()
const adminStore = useAdminStore()
const loadingHistory = ref(false)

// 🔧 Deteksi mock mode
const isMockMode = computed(() => {
  // Cek apakah mock interceptor aktif (bisa dilihat dari log atau flag global)
  return true // Sementara selalu true, nanti bisa diganti dengan env variable
})

const syncColumns = [
  { name: 'timestamp', label: 'Waktu', field: 'timestamp', align: 'left' },
  { name: 'pembelajaran_id', label: 'Pembelajaran', field: 'pembelajaran_id', align: 'left' },
  { name: 'semester_id', label: 'Semester', field: 'semester_id', align: 'center' },
  { name: 'synced_count', label: 'Jumlah Data', field: 'synced_count', align: 'center' },
  { name: 'message', label: 'Status', field: 'message', align: 'left' }
]

const formatDate = (iso) => {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

// const confirmResetMock = () => {
//   $q.dialog({
//     title: 'Reset Mock Data',
//     message: 'Reset semua data mock ke state awal?<br><br>Ini akan mengembalikan:<br>• Sessions ke 3 data awal<br>• Warning counter ke 0<br><br><i>Berguna untuk testing berulang.</i>',
//     html: true,
//     cancel: { label: 'Batal', flat: true },
//     ok: { label: 'Ya, Reset', color: 'warning', flat: true },
//     persistent: true
//   }).onOk(() => {
//     resetMockData()
//     $q.notify({
//       type: 'positive',
//       message: 'Mock data berhasil di-reset!'
//     })
//     // Refresh data
//     adminStore.fetchDashboardStats()
//     adminStore.fetchSyncHistory()
//   })
// }

onMounted(async () => {
  try {
    loadingHistory.value = true
    await Promise.all([
      adminStore.fetchDashboardStats(),
      adminStore.fetchSyncHistory()
    ])
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal memuat data dashboard' })
  } finally {
    loadingHistory.value = false
  }
})
</script>

<style scoped>
.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}
</style>
