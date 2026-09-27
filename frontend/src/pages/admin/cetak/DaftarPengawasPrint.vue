<!-- src/pages/admin/cetak/DaftarPengawasPrint.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" @click="$router.back()" class="q-mr-sm" />
      <div>
        <div class="text-h6">Daftar Pengawas Ujian</div>
        <div class="text-caption text-grey-7">
          Daftar pengawas per hari dan ruang. Layout landscape, auto-paginate.
        </div>
      </div>
      <q-space />
      <q-btn color="primary" icon="print" label="Cetak" :disable="rows.length === 0 || printing" :loading="printing"
        @click="onPrint('open')" />
      <q-btn flat color="primary" icon="picture_as_pdf" label="Unduh PDF" class="q-ml-sm"
        :disable="rows.length === 0 || printing" @click="onPrint('download')" />
    </div>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-3">
          <q-input v-model="filters.tanggal" type="date" dense outlined label="Tanggal (opsional)" clearable
            @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filters.ruang" dense outlined label="Ruang (opsional)" :options="ruangOptions" emit-value
            map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filters.jenis_ujian_id" dense outlined label="Jenis Ujian" :options="examTypeOptions"
            emit-value map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-3 text-right">
          <q-btn flat icon="refresh" label="Muat Ulang" @click="reload" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Stats bar -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-blue-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Total Jadwal</div>
            <div class="text-h6 text-weight-bold">{{ rows.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-teal-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Ruang Terpakai</div>
            <div class="text-h6 text-weight-bold">{{ uniqueRuang }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-green-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Pengawas Bertugas</div>
            <div class="text-h6 text-weight-bold">{{ uniquePengawas }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered :class="emptyAssign > 0 ? 'bg-orange-1' : 'bg-grey-2'">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Belum di-assign</div>
            <div class="text-h6 text-weight-bold">{{ emptyAssign }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="rows" :columns="columns" row-key="_key" flat dense :loading="loading"
        :pagination="{ rowsPerPage: 25 }" no-data-label="Tidak ada jadwal sesuai filter">
        <template #body-cell-ruang="props">
          <q-td :props="props" class="text-center">
            <q-badge color="primary" :label="props.row.ruang_nama || '-'" />
          </q-td>
        </template>
        <template #body-cell-jam="props">
          <q-td :props="props">
            <div>{{ props.row.jam_mulai }}–{{ calcEndTime(props.row.jam_mulai, props.row.durasi_menit) }}</div>
            <div class="text-caption text-grey-7">{{ props.row.durasi_menit }} mnt</div>
          </q-td>
        </template>
        <template #body-cell-pengawas1="props">
          <q-td :props="props">
            <span v-if="props.row.pengawas_namas?.[0]">
              <q-icon name="person" size="xs" color="primary" class="q-mr-xs" />
              {{ props.row.pengawas_namas[0] }}
            </span>
            <span v-else class="text-caption text-grey-6 italic">Belum di-assign</span>
          </q-td>
        </template>
        <template #body-cell-pengawas2="props">
          <q-td :props="props">
            <span v-if="props.row.pengawas_namas?.[1]">
              <q-icon name="person" size="xs" color="primary" class="q-mr-xs" />
              {{ props.row.pengawas_namas[1] }}
            </span>
            <span v-else class="text-caption text-grey-6 italic">Belum di-assign</span>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { useProctorListPrint } from '@/composables/admin/useProctorListPrint'
import { calcEndTime } from '@/utils/exam/scheduleHelpers'

const $q = useQuasar()
const { printing, print } = useProctorListPrint()


const schedulesRaw = ref([])
const examTypes = ref([])
const loading = ref(false)

const filters = ref({
  tanggal: '',        // default kosong → tampil SEMUA jadwal
  ruang: null,
  jenis_ujian_id: null,
})

const columns = [
  { name: 'ruang', label: 'Ruang', field: 'ruang_nama', align: 'center', style: 'width: 90px' },
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'min-width: 130px' },
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left' },
  { name: 'jam', label: 'Jam', field: 'jam_mulai', align: 'left', style: 'min-width: 150px' },
  { name: 'pengawas1', label: 'Pengawas 1', field: 'pengawas1', align: 'left', style: 'min-width: 180px' },
  { name: 'pengawas2', label: 'Pengawas 2', field: 'pengawas2', align: 'left', style: 'min-width: 180px' },
]

// ── Flatten: setiap (jadwal × detail) → 1 row
const rows = computed(() => {
  const out = []
  schedulesRaw.value.forEach((s) => {
    const details = Array.isArray(s.details) ? s.details : []
    if (details.length === 0) {
      // Tetap tampil walau tanpa detail kelas
      out.push({
        _key: `${s.id}-no-detail`,
        ...s,
        class_nama: '-',
        ruang_nama: '-',
        pengawas_namas: [],
      })
      return
    }
    details.forEach((d, idx) => {
      out.push({
        _key: `${s.id}-${idx}`,
        ...s,
        class_id: d.class_id,
        class_nama: d.class_nama,
        ruang_id: d.ruang_id,
        ruang_nama: d.ruang_nama,
        pengawas_ids: d.pengawas_ids || [],
        pengawas_namas: d.pengawas_namas || [],
      })
    })
  })
  // Sort by jam_mulai lalu ruang_nama
  return out.sort((a, b) => {
    const t = (a.jam_mulai || '').localeCompare(b.jam_mulai || '')
    if (t !== 0) return t
    return (a.ruang_nama || '').localeCompare(b.ruang_nama || '')
  })
})

const ruangOptions = computed(() => {
  const set = new Set()
  schedulesRaw.value.forEach((s) => {
    ; (s.details || []).forEach((d) => {
      if (d.ruang_nama) set.add(d.ruang_nama)
    })
  })
  return Array.from(set).sort().map((r) => ({ label: r, value: r }))
})

const examTypeOptions = computed(() =>
  examTypes.value.map((t) => ({ label: `${t.kode} — ${t.nama}`, value: t.id })),
)

const uniqueRuang = computed(() => {
  const set = new Set()
  rows.value.forEach((r) => {
    if (r.ruang_nama && r.ruang_nama !== '-') set.add(r.ruang_nama)
  })
  return set.size
})

const uniquePengawas = computed(() => {
  const set = new Set()
  rows.value.forEach((r) => {
    ; (r.pengawas_namas || []).forEach((n) => n && set.add(n))
  })
  return set.size
})

const emptyAssign = computed(
  () =>
    rows.value.filter(
      (r) => !r.pengawas_namas || r.pengawas_namas.length === 0,
    ).length,
)

// ── Load
const loadRefs = async () => {
  try {
    const res = await ExamTypeService.list()
    examTypes.value = res.data?.data || res.data || []
  } catch (e) {
    console.warn('[DaftarPengawas] loadExamTypes failed', e)
  }
}

const reload = async () => {
  loading.value = true
  try {
    const res = await ExamScheduleService.list({
      jenis_ujian_id: filters.value.jenis_ujian_id || undefined,
      tanggal: filters.value.tanggal || undefined,
    })
    schedulesRaw.value = res.data?.data || []
  } catch (e) {
    console.error('[DaftarPengawas] reload failed', e)
    schedulesRaw.value = []
  } finally {
    loading.value = false
  }
}

// Filter ruang lokal
const filteredRows = computed(() => {
  if (!filters.value.ruang) return rows.value
  return rows.value.filter((r) => r.ruang_nama === filters.value.ruang)
})

// Untuk print, pakai filteredRows
const onPrint = async (mode) => {
  const res = await print({
    rows: filteredRows.value,
    filters: {
      jenis_ujian_id: filters.value.jenis_ujian_id,
      tanggal: filters.value.tanggal,
      ruang: filters.value.ruang,
    },
    mode,
  })
  if (!res.success) {
    $q.notify({ type: 'warning', message: res.message || 'Gagal cetak' })
  } else if (mode === 'download') {
    $q.notify({ type: 'positive', message: `PDF (${res.count} baris) berhasil diunduh` })
  }
}

onMounted(async () => {
  await loadRefs()
  reload()
})
</script>
