<template>
  <q-page padding class="bg-grey-2">
    <!-- Header -->
    <div class="q-mb-lg row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Pusat Kendali Sistem Multi-Tenant</h5>
        <div class="text-caption text-grey-7">
          Monitoring beban komputasi VPS global dan lalu lintas Cloudflare Tunnel sekolah.
        </div>
      </div>
      <q-btn flat dense round icon="refresh" color="primary" :loading="isRefreshing" @click="manualRefresh">
        <q-tooltip>Refresh manual</q-tooltip>
      </q-btn>
    </div>

    <!-- Error state banner — muncul kalau errorState !== null -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Dashboard stats belum tersedia dari backend (Phase 7+). Menampilkan data default.
    </q-banner>

    <q-banner v-else-if="errorState === 'network_error'" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="wifi_off" color="orange" />
      </template>
      Koneksi terputus. Data terakhir tetap ditampilkan. Polling akan mencoba lagi.
    </q-banner>

    <q-banner v-else-if="errorState === 'server_error'" dense rounded class="bg-red-1 text-red-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="error" color="red" />
      </template>
      Server error. Data terakhir tetap ditampilkan. Klik refresh untuk coba lagi.
    </q-banner>

    <q-banner v-else-if="errorState === 'contract_mismatch'" dense rounded class="bg-purple-1 text-purple-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="report" color="purple" />
      </template>
      Response backend tidak sesuai kontrak. Hubungi AI#1.
    </q-banner>

    <!-- Banner kritikal RAM / CPU -->
    <q-banner v-if="cpuCritical || ramPercentage > 85" inline-actions
      class="text-white bg-red-9 q-mb-lg rounded-borders flat">
      <template v-slot:avatar>
        <q-icon name="report_problem" color="white" />
      </template>
      Peringatan: Resource VPS 2GB kritis! Segera lakukan penutupan izin pintu sinkronisasi massal
      pada manajemen tenant.
    </q-banner>

    <!-- Baris 1: Kartu Metrik Utama -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-indigo-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">Total Sekolah</div>
              <div class="text-h4 text-weight-bolder">{{ num(stats.total_schools) }}</div>
            </div>
            <q-icon name="corporate_fare" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-teal-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">Ujian Berlangsung</div>
              <div class="text-h4 text-weight-bolder">{{ num(stats.active_exams) }}</div>
            </div>
            <q-icon name="assignment_turned_in" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-blue-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">Siswa Terkoneksi</div>
              <div class="text-h4 text-weight-bolder">
                {{ num(stats.total_participants_online) }}
              </div>
            </div>
            <q-icon name="bolt" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="bg-deep-purple-7 text-white">
          <q-card-section class="row justify-between items-center no-wrap">
            <div>
              <div class="text-subtitle2 text-weight-light text-uppercase">CF Tunnel Sekolah</div>
              <div class="text-h4 text-weight-bolder">
                {{ num(stats.active_tunnels) }}
                <span class="text-caption text-weight-light">Link</span>
              </div>
            </div>
            <q-icon name="lan" size="lg" class="opacity-40" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Baris 2: Resource + Audit Trail -->
    <div class="row q-col-gutter-md">
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
                <span :class="cpuCritical ? 'text-red text-weight-bold' : 'text-grey-7'">
                  {{ num(stats.vps_cpu_estimate) }}%
                </span>
              </div>
              <q-linear-progress :value="cpuPercent / 100" size="12px" :color="cpuCritical ? 'red' : 'primary'" stripe
                rounded />
            </div>

            <!-- RAM Progress -->
            <div>
              <div class="row justify-between text-caption text-weight-medium q-mb-xs">
                <span>Alokasi Memori (RAM)</span>
                <span>
                  {{ num(stats.vps_ram_used_mb) }}MB /
                  {{ num(stats.vps_ram_total_mb) }}MB
                </span>
              </div>
              <q-linear-progress :value="ramPercentage / 100" size="12px" :color="ramPercentage > 85 ? 'red' : 'orange'"
                stripe rounded />
              <div class="text-right text-caption text-grey-6 q-mt-xs">
                Tersisa: {{ num(ramFree) }} MB Beban Kosong
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="bg-white text-grey-9 text-weight-bold row items-center border-bottom">
            <q-icon name="history_toggle_off" color="primary" size="sm" class="q-mr-xs" />
            Aktivitas Masuk Tenant Terbaru
          </q-card-section>

          <q-card-section class="q-pt-md">
            <!-- Empty state -->
            <div v-if="!systemLogs.length" class="text-center text-grey-6 q-pa-md">
              <q-icon name="inbox" size="md" />
              <div class="text-caption q-mt-xs">Belum ada aktivitas.</div>
            </div>

            <!-- Timeline -->
            <q-timeline v-else color="primary">
              <q-timeline-entry v-for="log in systemLogs" :key="log.id" :title="log.event"
                :subtitle="`${log.time} - ${log.school}`" :color="log.status || 'primary'" icon="done" side="right">
                <div class="text-caption text-grey-6">
                  Operasi terpantau dari interseptor Cloudflare.
                </div>
              </q-timeline-entry>
            </q-timeline>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useSuperDashboard } from '@/composables/super/useSuperDashboard'

const {
  stats,
  systemLogs,
  isRefreshing,
  errorState,
  cpuPercent,
  cpuCritical,
  ramPercentage,
  ramFree,
  manualRefresh,
  num,
} = useSuperDashboard()
</script>

<style scoped>
.opacity-40 {
  opacity: 0.4;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}
</style>
