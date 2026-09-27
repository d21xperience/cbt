<!-- src/pages/admin/Sessions.vue -->
<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="event" color="primary" size="sm" class="q-mr-sm" />
          Sesi Ujian
        </div>
        <div class="text-caption text-grey-7">
          Monitoring pelaksanaan ujian. Sesi auto-generate dari jadwal ujian.
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="sync" label="Sync Ulang" no-caps :loading="syncing" @click="syncNow">
          <q-tooltip>Generate sesi baru dari jadwal</q-tooltip>
        </q-btn>
        <q-btn flat color="grey-7" icon="refresh" label="Muat Ulang" no-caps @click="reload" />
      </div>
    </div>

    <!-- Stats -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-blue-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Total Sesi</div>
            <div class="text-h6 text-weight-bold">{{ stats.total }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-grey-3">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Terjadwal</div>
            <div class="text-h6 text-weight-bold">{{ stats.scheduled }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-green-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Berlangsung</div>
            <div class="text-h6 text-weight-bold text-positive">{{ stats.active }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-teal-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Selesai</div>
            <div class="text-h6 text-weight-bold">{{ stats.completed }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="filters.search" dense outlined label="Cari (mapel / kelas / ruang)" debounce="300" clearable
            @update:model-value="reload">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="filters.tanggal" type="date" dense outlined label="Tanggal" clearable
            @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filters.ruang" dense outlined label="Ruang" :options="ruangOptions" emit-value map-options
            clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filters.status" dense outlined label="Status" :options="statusOptions" emit-value
            map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filters.jenis_ujian_id" dense outlined label="Jenis Ujian" :options="examTypeOptions"
            emit-value map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-1 text-right">
          <q-btn flat round dense icon="filter_alt_off" @click="resetFilters">
            <q-tooltip>Reset filter</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="sessions" :columns="columns" row-key="id" flat :loading="loading"
        :pagination="{ rowsPerPage: 25 }" no-data-label="Belum ada sesi. Klik 'Sync Ulang' untuk generate dari jadwal."
        @row-click="onRowClick" row-click>
        <template #body-cell-tanggal="props">
          <q-td :props="props">
            <div>{{ fmtShortDate(props.row.tanggal) }}</div>
            <div class="text-caption text-grey-7">{{ fmtHari(props.row.tanggal) }}</div>
          </q-td>
        </template>
        <template #body-cell-jam="props">
          <q-td :props="props">
            <div>{{ props.row.jam_mulai }}–{{ calcEndTime(props.row.jam_mulai, props.row.durasi_menit) }}</div>
            <div class="text-caption text-grey-7">{{ props.row.durasi_menit }} mnt</div>
          </q-td>
        </template>
        <template #body-cell-ruang="props">
          <q-td :props="props" class="text-center">
            <q-badge color="primary" :label="props.row.ruang_nama || '-'" />
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
          </q-td>
        </template>
        <template #body-cell-token="props">
          <q-td :props="props" class="text-center">
            <q-chip dense outline color="indigo" icon="vpn_key" class="text-weight-bold">
              {{ props.row.token }}
            </q-chip>
          </q-td>
        </template>
        <template #body-cell-progress="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-xs">
              <q-linear-progress :value="progressValue(props.row)" color="primary" track-color="grey-3" size="8px"
                style="min-width: 100px; flex: 1" />
              <div class="text-caption">
                {{ props.row.completed_count }}/{{ props.row.participant_count }}
              </div>
            </div>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center" style="white-space: nowrap">
            <!-- Start / Pause / Resume -->
            <q-btn v-if="props.row.status === 'SCHEDULED'" flat round dense icon="play_arrow" color="positive" size="sm"
              @click.stop="onStart(props.row)">
              <q-tooltip>Mulai sesi</q-tooltip>
            </q-btn>
            <q-btn v-if="props.row.status === 'ACTIVE'" flat round dense icon="pause" color="orange" size="sm"
              @click.stop="onPause(props.row)">
              <q-tooltip>Pause sesi</q-tooltip>
            </q-btn>
            <q-btn v-if="props.row.status === 'PAUSED'" flat round dense icon="play_arrow" color="positive" size="sm"
              @click.stop="onResume(props.row)">
              <q-tooltip>Lanjutkan sesi</q-tooltip>
            </q-btn>

            <!-- Extend -->
            <q-btn v-if="props.row.status === 'ACTIVE' || props.row.status === 'PAUSED'" flat round dense
              icon="more_time" color="indigo" size="sm" @click.stop="openExtendDialog(props.row)">
              <q-tooltip>Tambah waktu</q-tooltip>
            </q-btn>

            <!-- Regenerate token -->
            <q-btn flat round dense icon="vpn_key" color="deep-purple" size="sm" @click.stop="onRegenToken(props.row)">
              <q-tooltip>Regenerate token</q-tooltip>
            </q-btn>

            <!-- End -->
            <q-btn v-if="props.row.status !== 'COMPLETED'" flat round dense icon="stop" color="negative" size="sm"
              @click.stop="openEndDialog(props.row)">
              <q-tooltip>Akhiri sesi</q-tooltip>
            </q-btn>

            <!-- Detail -->
            <q-btn flat round dense icon="visibility" color="primary" size="sm" @click.stop="openDetail(props.row)">
              <q-tooltip>Buka monitoring</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>


    <!-- Dialog Extend Waktu -->
    <q-dialog v-model="extendDialog.open" persistent>
      <q-card style="min-width: 400px; max-width: 90vw">
        <q-card-section class="bg-indigo text-white row items-center">
          <q-icon name="more_time" size="md" class="q-mr-sm" />
          <div>
            <div class="text-h6">Tambah Waktu</div>
            <div class="text-caption">{{ extendDialog.row?.subject_nama }} — {{ extendDialog.row?.class_nama }}</div>
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div class="text-caption text-grey-7">Pilih preset atau input custom.</div>
          <div class="row q-gutter-sm">
            <q-btn v-for="p in [5, 10, 15, 30]" :key="p" outline color="indigo" :label="`+${p} mnt`" size="sm"
              @click="extendDialog.custom = p" />
          </div>
          <q-input v-model.number="extendDialog.custom" type="number" label="Custom (menit)" outlined dense min="1"
            max="120" suffix="menit" />
          <div class="text-caption text-grey-7">
            Extend saat ini: <b>{{ extendDialog.row?.extended_minutes || 0 }} menit</b>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="indigo" label="Terapkan" :disable="!extendDialog.custom" @click="onExtendApply" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog End / Force Submit -->
    <q-dialog v-model="endDialog.open" persistent>
      <q-card style="min-width: 440px; max-width: 90vw">
        <q-card-section class="bg-negative text-white row items-center">
          <q-icon name="warning" size="md" class="q-mr-sm" />
          <div>
            <div class="text-h6">Akhiri Sesi</div>
            <div class="text-caption">{{ endDialog.row?.subject_nama }} — {{ endDialog.row?.class_nama }}</div>
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div>
            <div class="text-body2">
              Peserta yang belum selesai: <b>{{ pendingCount }}</b>
            </div>
          </div>
          <q-banner dense rounded class="bg-orange-1 text-orange-9">
            <template #avatar><q-icon name="warning" color="orange" /></template>
            Pilihan:
            <ul class="q-my-sm q-pl-md">
              <li><b>Akhiri saja</b> — sesi ditutup, peserta yang belum selesai tetap bisa submit (grace period).</li>
              <li><b>Force Submit</b> — semua peserta dipaksa submit sekarang.</li>
            </ul>
          </q-banner>
          <div>
            <div class="text-caption text-grey-7 q-mb-sm">
              Ketik <b>AKHIRI</b> untuk konfirmasi:
            </div>
            <q-input v-model="endDialog.confirmText" outlined dense placeholder="AKHIRI" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="negative" label="Akhiri Saja" :disable="endDialog.confirmText !== 'AKHIRI'"
            @click="onEndApply(false)" />
          <q-btn color="deep-orange" icon="bolt" label="Force Submit Semua"
            :disable="endDialog.confirmText !== 'AKHIRI'" @click="onEndApply(true)" />
        </q-card-actions>
      </q-card>
    </q-dialog>



  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionsMonitoring } from '@/composables/admin/useSessionsMonitoring'
import { calcEndTime } from '@/utils/exam/scheduleHelpers'

const router = useRouter()

const {
  loading,
  syncing,
  sessions,
  filters,
  statusOptions,
  examTypeOptions,
  ruangOptions,
  stats,
  loadRefs,
  reload,
  syncNow,
  resetFilters,
  actionStart,
  actionPause,
  actionResume,
  actionEnd,
  actionExtend,
  actionForceSubmit,
  actionRegenToken,
} = useSessionsMonitoring()

const columns = [
  { name: 'tanggal', label: 'Tanggal', field: 'tanggal', align: 'left', style: 'min-width: 120px' },
  { name: 'jam', label: 'Jam', field: 'jam_mulai', align: 'left', style: 'min-width: 130px' },
  { name: 'ruang', label: 'Ruang', field: 'ruang_nama', align: 'center', style: 'width: 80px' },
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'min-width: 110px' },
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left' },
  { name: 'token', label: 'Token', field: 'token', align: 'center', style: 'width: 105px' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 110px' },
  { name: 'progress', label: 'Progress', field: 'progress', align: 'left', style: 'min-width: 150px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 180px' },
]
import { ref, computed } from 'vue'   // ← tambah ref, computed kalau belum

// ... existing ...

// ── Dialog Extend
const extendDialog = ref({ open: false, row: null, custom: 15 })

const openExtendDialog = (row) => {
  extendDialog.value = { open: true, row, custom: 15 }
}

const onExtendApply = async () => {
  const ok = await actionExtend(extendDialog.value.row, extendDialog.value.custom)
  if (ok) extendDialog.value.open = false
}

// ── Dialog End / Force Submit
const endDialog = ref({ open: false, row: null, confirmText: '' })

const pendingCount = computed(() => {
  const r = endDialog.value.row
  if (!r) return 0
  return (r.participant_count || 0) - (r.completed_count || 0)
})

const openEndDialog = (row) => {
  endDialog.value = { open: true, row, confirmText: '' }
}

const onEndApply = async (force) => {
  const row = endDialog.value.row
  const ok = force ? await actionForceSubmit(row) : await actionEnd(row)
  if (ok) endDialog.value.open = false
}

// ── Wrapper
const onStart = async (row) => {
  await actionStart(row)
}

const onPause = async (row) => {
  await actionPause(row)
}

const onResume = async (row) => {
  await actionResume(row)
}

const onRegenToken = async (row) => {
  await actionRegenToken(row)
}
const fmtShortDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtHari = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long' })
}

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

const progressValue = (row) => {
  if (!row.participant_count) return 0
  return (row.completed_count || 0) / row.participant_count
}

const openDetail = (row) => {
  router.push({ name: 'admin-session-detail', params: { id: row.id } })
}

const onRowClick = (evt, row) => {
  openDetail(row)
}

onMounted(async () => {
  await loadRefs()
  await reload()
})
</script>
