<!-- src/pages/admin/SessionDetail.vue -->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" @click="$router.back()" class="q-mr-sm" />
      <div>
        <div class="text-h6">
          <q-icon name="monitor_heart" color="primary" size="sm" class="q-mr-sm" />
          Monitoring Sesi
        </div>
        <div class="text-caption text-grey-7" v-if="session">
          {{ session.subject_nama }} — {{ session.class_nama }} — Ruang {{ session.ruang_nama }}
        </div>
      </div>
      <q-space />

      <!-- Auto refresh toggle -->
      <q-toggle :model-value="autoRefresh" label="Auto-refresh" color="primary" dense class="q-mr-md"
        @update:model-value="toggleAutoRefresh">
        <q-tooltip>Refresh otomatis setiap {{ refreshIntervalSec }} detik</q-tooltip>
      </q-toggle>

      <q-btn flat round dense icon="refresh" color="primary" :loading="refreshing" @click="manualRefresh">
        <q-tooltip>Refresh sekarang</q-tooltip>
      </q-btn>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="3rem" />
      <div class="text-caption text-grey-7 q-mt-md">Memuat detail sesi...</div>
    </div>

    <!-- Content -->
    <template v-else-if="session">
      <!-- SESSION INFO CARD -->
      <q-card flat bordered class="q-mb-md bg-white">
        <q-card-section class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-6">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-7">Token</div>
                <q-chip dense outline color="indigo" icon="vpn_key" class="text-weight-bold">
                  {{ session.token }}
                </q-chip>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Status</div>
                <q-badge :color="statusColor(session.status)" :label="statusLabel(session.status)" />
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Jadwal</div>
                <div class="text-body2">
                  {{ fmtShortDate(session.tanggal) }} • {{ session.jam_mulai }}–{{
                    calcEndTime(session.jam_mulai, session.durasi_menit + (session.extended_minutes || 0))
                  }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Extend</div>
                <div class="text-body2">
                  <span v-if="session.extended_minutes">+{{ session.extended_minutes }} menit</span>
                  <span v-else class="text-grey-6">—</span>
                </div>
              </div>
              <div class="col-12">
                <div class="text-caption text-grey-7">Pengawas</div>
                <div class="text-body2">
                  <span v-if="session.pengawas_namas?.length">
                    {{ session.pengawas_namas.join(' • ') }}
                  </span>
                  <span v-else class="text-grey-6 italic">Belum di-assign</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Aksi Control -->
          <div class="col-12 col-md-6">
            <div class="text-caption text-grey-7 q-mb-sm">Aksi Cepat</div>
            <div class="q-gutter-sm">
              <q-btn v-if="session.status === 'SCHEDULED'" color="positive" icon="play_arrow" label="Mulai" no-caps
                size="sm" @click="actionStart" />
              <q-btn v-if="session.status === 'ACTIVE'" color="orange" icon="pause" label="Pause" no-caps size="sm"
                @click="actionPause" />
              <q-btn v-if="session.status === 'PAUSED'" color="positive" icon="play_arrow" label="Lanjutkan" no-caps
                size="sm" @click="actionResume" />

              <q-btn v-if="session.status === 'ACTIVE' || session.status === 'PAUSED'" outline color="indigo"
                icon="more_time" label="Extend" no-caps size="sm" @click="extendOpen = true" />
              <q-btn v-if="session.status !== 'COMPLETED'" outline color="deep-orange" icon="bolt" label="Force Submit"
                no-caps size="sm" @click="forceOpen = true" />
              <q-btn outline color="deep-purple" icon="vpn_key" label="Token Baru" no-caps size="sm"
                @click="onRegenToken" />
              <q-btn v-if="session.status !== 'COMPLETED'" outline color="negative" icon="stop" label="Akhiri" no-caps
                size="sm" @click="endOpen = true" />
            </div>
            <div v-if="lastRefreshAt" class="text-caption text-grey-6 q-mt-sm">
              Refresh terakhir: {{ fmtTime(lastRefreshAt) }}
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- STATS -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-6 col-md-2">
          <q-card flat bordered class="bg-blue-1">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7">Total</div>
              <div class="text-h6 text-weight-bold">{{ stats.total }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-2">
          <q-card flat bordered class="bg-grey-3">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7">Belum Mulai</div>
              <div class="text-h6 text-weight-bold">{{ stats.belum_mulai }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-2">
          <q-card flat bordered class="bg-green-1">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7">Aktif</div>
              <div class="text-h6 text-weight-bold text-positive">{{ stats.aktif }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-2">
          <q-card flat bordered class="bg-teal-1">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7">Selesai</div>
              <div class="text-h6 text-weight-bold">{{ stats.selesai }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-2">
          <q-card flat bordered class="bg-orange-1">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7">Terblokir</div>
              <div class="text-h6 text-weight-bold text-orange">{{ stats.terblokir }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-2">
          <q-card flat bordered class="bg-red-1">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7">Pelanggaran</div>
              <div class="text-h6 text-weight-bold text-negative">{{ stats.violations }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- TABS -->
      <q-card flat bordered class="bg-white">
        <q-tabs v-model="tab" dense align="left" class="text-primary" active-color="primary" indicator-color="primary">
          <q-tab name="peserta" icon="groups" :label="`Peserta (${participants.length})`" />
          <q-tab name="pelanggaran" icon="warning" :label="`Pelanggaran (${violations.length})`" />
          <q-tab name="aktivitas" icon="history" :label="`Aktivitas (${activities.length})`" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <!-- TAB PESERTA -->
          <q-tab-panel name="peserta" class="q-pa-none">
            <q-table :rows="participants" :columns="participantColumns" row-key="student_id" flat dense
              :pagination="{ rowsPerPage: 25 }" no-data-label="Tidak ada peserta">
              <template #body-cell-status="props">
                <q-td :props="props" class="text-center">
                  <q-badge :color="pStatusColor(props.row.status)" :label="pStatusLabel(props.row.status)" />
                </q-td>
              </template>
              <template #body-cell-progress="props">
                <q-td :props="props">
                  <div class="row items-center q-gutter-xs">
                    <q-linear-progress :value="props.row.progress_percent / 100"
                      :color="progressColor(props.row.progress_percent)" track-color="grey-3" size="8px"
                      style="min-width: 100px; flex: 1" />
                    <div class="text-caption" style="width: 42px; text-align: right">
                      {{ props.row.progress_percent }}%
                    </div>
                  </div>
                </q-td>
              </template>
              <template #body-cell-violations_count="props">
                <q-td :props="props" class="text-center">
                  <q-badge v-if="props.row.violations_count > 0" color="negative"
                    :label="`${props.row.violations_count}`" />
                  <span v-else class="text-grey-5">—</span>
                </q-td>
              </template>
              <template #body-cell-last_seen="props">
                <q-td :props="props">
                  <span v-if="props.row.last_seen" class="text-caption">
                    {{ fmtTime(props.row.last_seen) }}
                  </span>
                  <span v-else class="text-grey-5">—</span>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- TAB PELANGGARAN -->
          <q-tab-panel name="pelanggaran" class="q-pa-none">
            <q-table :rows="violations" :columns="violationColumns" row-key="id" flat dense
              :pagination="{ rowsPerPage: 25 }" no-data-label="Tidak ada pelanggaran">
              <template #body-cell-action="props">
                <q-td :props="props" class="text-center">
                  <q-badge :color="props.row.action === 'BLOCK' ? 'negative' : 'orange'" :label="props.row.action" />
                </q-td>
              </template>
              <template #body-cell-timestamp="props">
                <q-td :props="props">
                  <div class="text-caption">{{ fmtDateTime(props.row.timestamp) }}</div>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <!-- TAB AKTIVITAS -->
          <q-tab-panel name="aktivitas">
            <q-timeline color="primary" v-if="activities.length > 0">
              <q-timeline-entry v-for="act in activities" :key="act.id" :icon="act.icon" :color="act.color">
                <template #title>
                  <div class="text-body2">
                    {{ act.description }}
                  </div>
                </template>
                <template #subtitle>
                  <div class="text-caption text-grey-7">
                    {{ fmtDateTime(act.timestamp) }}
                    <span v-if="act.actor" class="q-ml-sm">• {{ act.actor }}</span>
                  </div>
                </template>
              </q-timeline-entry>
            </q-timeline>
            <div v-else class="text-center text-grey-7 q-pa-lg">
              <q-icon name="info" size="3rem" />
              <div class="q-mt-md">Belum ada aktivitas.</div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </template>

    <!-- Not found -->
    <div v-else class="text-center text-grey-7 q-pa-xl">
      <q-icon name="error_outline" size="4rem" />
      <div class="text-h6 q-mt-md">Sesi tidak ditemukan</div>
      <q-btn class="q-mt-md" flat color="primary" icon="arrow_back" label="Kembali" :to="{ name: 'admin-sessions' }" />
    </div>

    <!-- Dialog Extend -->
    <q-dialog v-model="extendOpen" persistent>
      <q-card style="min-width: 380px">
        <q-card-section class="bg-indigo text-white">
          <div class="text-h6">Tambah Waktu</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div class="row q-gutter-sm">
            <q-btn v-for="p in [5, 10, 15, 30]" :key="p" outline color="indigo" :label="`+${p} mnt`" size="sm"
              @click="extendCustom = p" />
          </div>
          <q-input v-model.number="extendCustom" type="number" label="Custom (menit)" outlined dense min="1" max="120"
            suffix="menit" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="indigo" label="Terapkan" :disable="!extendCustom" @click="applyExtend" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog End -->
    <q-dialog v-model="endOpen" persistent>
      <q-card style="min-width: 440px; max-width: 90vw">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">Akhiri Sesi</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div>
            Peserta belum selesai: <b>{{ stats.aktif + stats.belum_mulai + stats.terblokir }}</b>
          </div>
          <div class="text-caption text-grey-7">
            Ketik <b>AKHIRI</b> untuk konfirmasi:
          </div>
          <q-input v-model="endConfirmText" outlined dense placeholder="AKHIRI" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="negative" label="Akhiri Saja" :disable="endConfirmText !== 'AKHIRI'" @click="applyEnd" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Force Submit -->
    <q-dialog v-model="forceOpen" persistent>
      <q-card style="min-width: 440px; max-width: 90vw">
        <q-card-section class="bg-deep-orange text-white">
          <div class="text-h6">Force Submit Semua Peserta</div>
        </q-card-section>
        <q-card-section>
          <q-banner dense rounded class="bg-orange-1 text-orange-9">
            <template #avatar><q-icon name="warning" color="orange" /></template>
            Semua peserta aktif akan dipaksa submit. Sesi langsung <b>selesai</b>.
          </q-banner>
          <div class="text-caption text-grey-7 q-mt-md">
            Ketik <b>FORCE</b> untuk konfirmasi:
          </div>
          <q-input v-model="forceConfirmText" outlined dense placeholder="FORCE" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="deep-orange" icon="bolt" label="Force Submit" :disable="forceConfirmText !== 'FORCE'"
            @click="applyForce" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionDetail } from '@/composables/admin/useSessionDetail'
import { calcEndTime } from '@/utils/exam/scheduleHelpers'

const route = useRoute()
const sessionId = route.params.id

const {
  loading,
  refreshing,
  session,
  participants,
  violations,
  activities,
  stats,
  autoRefresh,
  refreshIntervalSec,
  lastRefreshAt,
  loadAll,
  toggleAutoRefresh,
  actionStart,
  actionPause,
  actionResume,
  actionEnd,
  actionExtend,
  actionForceSubmit,
  actionRegenToken,
} = useSessionDetail()

const tab = ref('peserta')
const extendOpen = ref(false)
const endOpen = ref(false)
const forceOpen = ref(false)
const extendCustom = ref(15)
const endConfirmText = ref('')
const forceConfirmText = ref('')

// ── Columns
const participantColumns = [
  { name: 'no', label: 'No', field: 'no', align: 'center', style: 'width: 50px' },
  { name: 'nis', label: 'NIS', field: 'nis', align: 'left', style: 'width: 100px' },
  { name: 'nama', label: 'Nama', field: 'nama', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 120px' },
  { name: 'progress', label: 'Progress', field: 'progress_percent', align: 'left', style: 'min-width: 180px' },
  { name: 'violations_count', label: 'Pelanggaran', field: 'violations_count', align: 'center', style: 'width: 110px' },
  { name: 'last_seen', label: 'Terakhir Aktif', field: 'last_seen', align: 'left', style: 'min-width: 130px' },
]

const violationColumns = [
  { name: 'timestamp', label: 'Waktu', field: 'timestamp', align: 'left', style: 'width: 150px' },
  { name: 'student_nama', label: 'Siswa', field: 'student_nama', align: 'left' },
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'width: 110px' },
  { name: 'label', label: 'Jenis', field: 'label', align: 'left' },
  { name: 'action', label: 'Aksi', field: 'action', align: 'center', style: 'width: 90px' },
]

// ── Helpers
const statusColor = (s) => {
  if (s === 'ACTIVE') return 'positive'
  if (s === 'PAUSED') return 'orange'
  if (s === 'COMPLETED') return 'grey-7'
  return 'blue-grey'
}
const statusLabel = (s) => {
  if (s === 'ACTIVE') return 'Berlangsung'
  if (s === 'PAUSED') return 'Ditunda'
  if (s === 'COMPLETED') return 'Selesai'
  return 'Terjadwal'
}
const pStatusColor = (s) => {
  if (s === 'SELESAI') return 'positive'
  if (s === 'AKTIF') return 'primary'
  if (s === 'TERBLOKIR') return 'negative'
  return 'grey-5'
}
const pStatusLabel = (s) => {
  if (s === 'SELESAI') return 'Selesai'
  if (s === 'AKTIF') return 'Aktif'
  if (s === 'TERBLOKIR') return 'Terblokir'
  return 'Belum Mulai'
}
const progressColor = (p) => {
  if (p >= 80) return 'positive'
  if (p >= 50) return 'primary'
  if (p >= 20) return 'orange'
  return 'grey'
}

const fmtShortDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtTime = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
const fmtDateTime = (iso) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Actions
const manualRefresh = () => loadAll(sessionId, true)

const applyExtend = async () => {
  const ok = await actionExtend(extendCustom.value)
  if (ok) {
    extendOpen.value = false
    extendCustom.value = 15
  }
}

const applyEnd = async () => {
  const ok = await actionEnd()
  if (ok) {
    endOpen.value = false
    endConfirmText.value = ''
  }
}

const applyForce = async () => {
  const ok = await actionForceSubmit()
  if (ok) {
    forceOpen.value = false
    forceConfirmText.value = ''
  }
}

const onRegenToken = async () => {
  await actionRegenToken()
}

// Numbering peserta
participantColumns[0].format = (val, row) => {
  const idx = participants.value.findIndex((x) => x.student_id === row.student_id)
  return idx + 1
}

onMounted(() => {
  loadAll(sessionId)
})
</script>
