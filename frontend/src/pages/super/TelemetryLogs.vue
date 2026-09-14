<template>
  <q-page padding class="bg-grey-1">
    <!-- Header -->
    <div class="q-mb-md row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Log Telemetri & Audit Infrastruktur</h5>
        <div class="text-caption text-grey-7">Pantau stabilitas Cloudflare Tunnel sekolah dan beban performa engine
          lokal secara real-time.</div>
      </div>
      <q-btn outline color="primary" icon="refresh" label="Segarkan Log" @click="fetchLogs" :loading="loading" />
    </div>

    <!-- Filter & Kontrol Pencarian -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-6">
          <q-input v-model="searchQuery" placeholder="Cari nama sekolah atau pesan log..." outlined dense clearable>
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-select v-model="statusFilter" :options="statusOptions" label="Filter Tingkat Keparahan" outlined dense
            emit-value map-options />
        </div>
      </q-card-section>
    </q-card>

    <!-- List Audit Trail -->
    <q-card flat bordered class="bg-white">
      <q-list separator>
        <q-item v-if="filteredLogs.length === 0" class="q-pa-lg text-center text-grey-6 text-subtitle1">
          Tidak ada log telemetri yang cocok dengan kriteria filter.
        </q-item>

        <q-item v-for="log in filteredLogs" :key="log.id" class="q-py-md">
          <q-item-section avatar top>
            <q-avatar :color="getSeverityColor(log.status)" text-color="white" icon="analytics" size="md" />
          </q-item-section>

          <q-item-section>
            <q-item-label class="row items-center q-gutter-xs">
              <span class="text-weight-bold text-grey-9 text-subtitle2">{{ log.school_name }}</span>
              <q-badge dense :color="getSeverityColor(log.status)" class="text-weight-bold">{{ log.status }}</q-badge>
              <q-badge dense outline color="primary">{{ log.component }}</q-badge>
            </q-item-label>
            <q-item-label class="text-grey-8 q-mt-xs text-body2">
              {{ log.message }}
            </q-item-label>
            <q-item-label caption class="q-mt-xs">
              IP Sekolah: <span class="text-weight-medium text-grey-7">{{ log.client_ip }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section side top>
            <div class="text-caption text-grey-6 row items-center">
              <q-icon name="schedule" size="xs" class="q-mr-xs" />
              {{ log.timestamp }}
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/boot/axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// State Komponen
const logs = ref([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('ALL')

const statusOptions = [
  { label: 'Semua Tingkat', value: 'ALL' },
  { label: 'SUCCESS (Normal)', value: 'SUCCESS' },
  { label: 'WARNING (Peringatan)', value: 'WARNING' },
  { label: 'CRITICAL (Bahaya)', value: 'CRITICAL' }
]

// Ambil Data dari API
const fetchLogs = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/v1/cbt/superadmin/telemetry/logs')
    logs.value = response.data
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal mengambil log audit telemetri server.' })
  } finally {
    loading.value = false
  }
}

// Logika Filter Reaktif
const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const matchesSearch = log.school_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'ALL' || log.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

// Skema Warna Dinamis
const getSeverityColor = (status) => {
  switch (status) {
    case 'SUCCESS': return 'green'
    case 'WARNING': return 'orange-8'
    case 'CRITICAL': return 'red-9'
    default: return 'grey-7'
  }
}

onMounted(() => {
  fetchLogs()
})
</script>
