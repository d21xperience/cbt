<!-- src/pages/admin/SyncSiakad.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">
      <q-icon name="sync" color="primary" size="md" class="q-mr-sm" />
      Sinkronisasi dari SIAKAD
    </div>

    <div class="row q-col-gutter-md">
      <!-- Form Sync -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Parameter Sync</div>

            <q-form @submit.prevent="onSync" class="q-gutter-md">
              <q-select v-model="form.pembelajaran_id" :options="pembelajaranOptions" label="Pembelajaran" outlined
                emit-value map-options :rules="[val => !!val || 'Pembelajaran wajib dipilih']">
                <template v-slot:prepend><q-icon name="book" /></template>
              </q-select>

              <q-select v-model="form.semester_id" :options="semesterOptions" label="Semester" outlined emit-value
                map-options :rules="[val => !!val || 'Semester wajib dipilih']">
                <template v-slot:prepend><q-icon name="calendar_today" /></template>
              </q-select>

              <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded>
                <template v-slot:avatar>
                  <q-icon name="info" color="primary" />
                </template>
                Sinkronisasi akan menarik data peserta dari SIAKAD (Dapodik) berdasarkan pembelajaran dan semester yang
                dipilih. Data
                yang sudah ada akan di-update.
              </q-banner>

              <q-btn type="submit" color="primary" label="Mulai Sinkronisasi" icon="sync" class="full-width"
                :loading="adminStore.isSyncing" :disable="adminStore.isSyncing" />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Info Panel -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Informasi</div>

            <q-list bordered separator>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="schedule" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Waktu Estimasi</q-item-label>
                  <q-item-label caption>1-3 menit tergantung jumlah data</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="cloud" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Koneksi</q-item-label>
                  <q-item-label caption>Membutuhkan koneksi ke server SIAKAD lokal</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="warning" color="orange" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Perhatian</q-item-label>
                  <q-item-label caption>Jangan tutup halaman saat proses sync berlangsung</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Hasil Sync Terakhir -->
        <q-card class="q-mt-md" v-if="lastSyncResult">
          <q-card-section>
            <div class="text-h6 q-mb-md">Hasil Sync Terakhir</div>
            <div class="text-center">
              <q-icon :name="lastSyncResult.success ? 'check_circle' : 'error'"
                :color="lastSyncResult.success ? 'positive' : 'negative'" size="60px" />
              <div class="text-h5 q-mt-md" :class="lastSyncResult.success ? 'text-positive' : 'text-negative'">
                {{ lastSyncResult.success ? 'Berhasil' : 'Gagal' }}
              </div>
              <div v-if="lastSyncResult.success" class="text-h3 text-primary q-mt-md">
                {{ lastSyncResult.synced_count }}
              </div>
              <div class="text-caption">data peserta berhasil disinkronkan</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from '@/stores/admin/dashboard'

const $q = useQuasar()
const adminStore = useAdminStore()

const form = reactive({
  pembelajaran_id: '',
  semester_id: ''
})

const lastSyncResult = ref(null)

// Data dummy untuk dropdown (di real app, ini dari API)
const pembelajaranOptions = [
  { label: 'Matematika Kelas X - IPA 1', value: 'pemb-001' },
  { label: 'Bahasa Indonesia Kelas XI', value: 'pemb-002' },
  { label: 'IPA Terpadu Kelas VIII', value: 'pemb-003' },
  { label: 'Bahasa Inggris Kelas IX', value: 'pemb-004' }
]

const semesterOptions = [
  { label: '2025/2026 - Ganjil', value: '20251' },
  { label: '2025/2026 - Genap', value: '20252' },
  { label: '2026/2027 - Ganjil', value: '20261' }
]

const onSync = async () => {
  $q.dialog({
    title: 'Konfirmasi Sinkronisasi',
    message: `Anda akan menyinkronkan data dari SIAKAD untuk pembelajaran <b>${getPembelajaranLabel()}</b>.<br><br>Lanjutkan?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Ya, Sinkronkan', color: 'primary', flat: true },
    persistent: true
  }).onOk(async () => {
    try {
      const result = await adminStore.syncFromSiakad(
        form.pembelajaran_id,
        form.semester_id
      )

      lastSyncResult.value = {
        success: true,
        synced_count: result.synced_count
      }

      $q.notify({
        type: 'positive',
        message: `Sinkronisasi berhasil! ${result.synced_count} data peserta telah disinkronkan.`,
        timeout: 3000
      })
    } catch (error) {
      lastSyncResult.value = { success: false }
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Sinkronisasi gagal. Periksa koneksi ke SIAKAD.',
        timeout: 3000
      })
    }
  })
}

const getPembelajaranLabel = () => {
  const found = pembelajaranOptions.find(o => o.value === form.pembelajaran_id)
  return found ? found.label : form.pembelajaran_id
}
</script>
