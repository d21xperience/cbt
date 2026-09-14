<template>
  <q-page padding class="bg-grey-2">
    <!-- Header Dashboard -->
    <div class="q-mb-lg">
      <h5 class="q-my-none text-weight-bold text-primary">Pusat Kendali Sistem Multi-Tenant</h5>
      <div class="text-caption text-grey-7">Monitoring beban komputasi VPS global dan lalu lintas Cloudflare Tunnel
        sekolah.</div>
    </div>

    <!-- Alert Sistem jika RAM Kritis (>85%) -->
    <q-banner v-if="stats.vps_cpu_estimate > 80 || ramPercentage > 85" inline-actions
      class="text-white bg-red-9 q-mb-lg rounded-borders flat animate__animated animate__fadeIn">
      <template v-slot:avatar>
        <q-icon name="report_problem" color="white" />
      </template>
      Peringatan: Resource VPS 2GB kritis! Segera lakukan penutupan izin pintu sinkronisasi massal pada manajemen
      tenant.
    </q-banner>

    <!-- Baris 1: Kartu Metrik Utama -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Total Tenant -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-indigo-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">Total Sekolah</div>
              <div class="text-h4 text-weight-bolder">{{ stats.total_schools }}</div>
            </div>
            <q-icon name="corporate_fare" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Sesi Ujian Aktif -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-teal-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">Ujian Berlangsung</div>
              <div class="text-h4 text-weight-bolder">{{ stats.active_exams }}</div>
            </div>
            <q-icon name="assignment_turned_in" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Total Siswa Online -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-blue-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">Siswa Terkoneksi</div>
              <div class="text-h4 text-weight-bolder">{{ stats.total_participants_online }}</div>
            </div>
            <q-icon name="bolt" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Tunnel Aktif -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-deep-purple-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">CF Tunnel Sekolah</div>
              <div class="text-h4 text-weight-bolder">{{ stats.active_tunnels }} <span
                  class="text-caption text-weight-light">Link</span></div>
            </div>
            <q-icon name="lan" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Baris 2: Indikator Resource VPS & Audit Trail Log -->
    <div class="row q-col-gutter-md">
      <!-- Sisi Kiri: Detail Resource Monitoring -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="bg-white text-grey-9 text-weight-bold row items-center border-bottom">
            <q-icon name="memory" color="primary" size="sm" class="q-mr-xs" />
            Metrik Server Komputasi VPS
          </q-card-section>

          <q-card-section class="q-gutter-md q-pt-md">
            <!-- CPU Progress -->
            <div>
              <div class="row justify-between text-caption text-weight-medium q-mb-xs">
                <span>Utilisasi CPU Server</span>
                <span :class="stats.vps_cpu_estimate > 80 ? 'text-red text-weight-bold' : 'text-grey-7'">{{
                  stats.vps_cpu_estimate }}%</span>
              </div>
              <q-linear-progress :value="stats.vps_cpu_estimate / 100" size="12px"
                :color="stats.vps_cpu_estimate > 80 ? 'red' : 'primary'" stripe rounded />
            </div>

            <!-- RAM Progress -->
            <div>
              <div class="row justify-between text-caption text-weight-medium q-mb-xs">
                <span>Alokasi Memori (RAM)</span>
                <span>{{ stats.vps_ram_used_mb }}MB / {{ stats.vps_ram_total_mb }}MB</span>
              </div>
              <q-linear-progress :value="ramPercentage / 100" size="12px" :color="ramPercentage > 85 ? 'red' : 'orange'"
                stripe rounded />
              <div class="text-right text-caption text-grey-6 q-mt-xs">Tersisa: {{ stats.vps_ram_total_mb -
                stats.vps_ram_used_mb }} MB Beban Kosong</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Sisi Kanan: Real-Time Audit System Logs -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="bg-white text-grey-9 text-weight-bold row items-center border-bottom">
            <q-icon name="history_toggle_off" color="primary" size="sm" class="q-mr-xs" />
            Aktivitas Masuk Tenant Terbaru
          </q-card-section>

          <q-card-section class="q-pt-md">
            <q-timeline color="primary">
              <q-timeline-entry v-for="log in systemLogs" :key="log.id" :title="log.event"
                :subtitle="`${log.time} - ${log.school}`" :color="log.status" icon="done" side="right">
                <div class="text-caption text-grey-6">Operasi terpantau dari interseptor Cloudflare.</div>
              </q-timeline-entry>
            </q-timeline>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/boot/axios'

const stats = ref({
  total_schools: 0,
  active_exams: 0,
  total_participants_online: 0,
  vps_cpu_estimate: 0,
  vps_ram_used_mb: 0,
  vps_ram_total_mb: 2048,
  active_tunnels: 0
})

const systemLogs = ref([])
let pollingTimer = null

// Hitung persentase RAM secara reaktif
const ramPercentage = computed(() => {
  if (!stats.value.vps_ram_total_mb) return 0
  return Math.round((stats.value.vps_ram_used_mb / stats.value.vps_ram_total_mb) * 100)
})

// Fungsi memanggil API gabungan data dashboard
const loadDashboardData = async () => {
  try {
    const [statsRes, logsRes] = await Promise.all([
      api.get('/super/dashboard/stats'),
      api.get('/super/dashboard/logs')
    ])
    stats.value = statsRes.data
    systemLogs.value = logsRes.data
  } catch (error) {
    console.error('Gagal memuat status kontrol dashboard:', error)
  }
}

onMounted(() => {
  loadDashboardData()
  // Lakukan polling otomatis hemat daya setiap 20 detik
  pollingTimer = setInterval(loadDashboardData, 20000)
})

onBeforeUnmount(() => {
  // Bersihkan polling ketika pindah menu agar hemat beban CPU client
  if (pollingTimer) clearInterval(pollingTimer)
})
</script>

<style scoped>
.opacity-40 {
  opacity: 0.4;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}
</style>
