<!-- src/pages/admin/cetak/BeritaAcaraPrint.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" @click="$router.back()" class="q-mr-sm" />
      <div>
        <div class="text-h6">Berita Acara Ujian</div>
        <div class="text-caption text-grey-7">
          Cetak lembar isian Berita Acara per jadwal × kelas. Pengawas mengisi manual.
        </div>
      </div>
      <q-space />
      <q-btn flat color="grey-7" icon="settings" label="Edit Template" no-caps
        @click="$router.push({ name: 'admin-cetak-berita-acara-template' })" class="q-mr-sm" />
      <q-btn color="primary" icon="print" label="Cetak Terpilih" :disable="selected.length === 0 || printing"
        :loading="printing" @click="onPrintSelected('open')" />
      <q-btn flat color="primary" icon="picture_as_pdf" label="Unduh PDF" class="q-ml-sm"
        :disable="selected.length === 0 || printing" @click="onPrintSelected('download')" />
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
            map-options clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filters.jenis_ujian_id" dense outlined label="Jenis Ujian (opsional)"
            :options="examTypeOptions" emit-value map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-3 text-right">
          <q-btn flat icon="refresh" label="Muat Ulang" @click="reload" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Stats -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-6 col-md-4">
        <q-card flat bordered class="bg-blue-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Total Lembar BA</div>
            <div class="text-h6 text-weight-bold">{{ rows.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-4">
        <q-card flat bordered class="bg-teal-1">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Kelas Tercover</div>
            <div class="text-h6 text-weight-bold">{{ uniqueKelas }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-4">
        <q-card flat bordered :class="emptyAssign > 0 ? 'bg-orange-1' : 'bg-grey-2'">
          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-7">Belum di-assign Pengawas</div>
            <div class="text-h6 text-weight-bold">{{ emptyAssign }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredRows" :columns="columns" row-key="_key" flat dense :loading="loading"
        v-model:selected="selected" selection="multiple" :pagination="{ rowsPerPage: 25 }"
        no-data-label="Tidak ada jadwal sesuai filter">
        <template #body-cell-tanggal="props">
          <q-td :props="props">
            <div>{{ fmtShortDate(props.row.tanggal) }}</div>
            <div class="text-caption text-grey-7">{{ fmtHari(props.row.tanggal) }}</div>
          </q-td>
        </template>
        <template #body-cell-jam="props">
          <q-td :props="props">
            <div>{{ props.row.jam_mulai }}–{{ calcEndTime(props.row.jam_mulai, props.row.durasi_menit) }}</div>
          </q-td>
        </template>
        <template #body-cell-ruang="props">
          <q-td :props="props" class="text-center">
            <q-badge color="primary" :label="props.row.ruang_nama || '-'" />
          </q-td>
        </template>
        <template #body-cell-pengawas="props">
          <q-td :props="props">
            <div v-if="props.row.pengawas_namas?.length">
              <div v-for="(n, i) in props.row.pengawas_namas.slice(0, 2)" :key="i" class="text-caption">
                <q-icon name="person" size="xs" color="primary" class="q-mr-xs" />{{ n }}
              </div>
            </div>
            <span v-else class="text-caption text-grey-6 italic">Belum di-assign</span>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat round dense icon="print" color="primary" size="sm" @click="onPrintSingle(props.row)">
              <q-tooltip>Cetak BA ini</q-tooltip>
            </q-btn>
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
import { useBeritaAcaraPrint } from '@/composables/admin/useBeritaAcaraPrint'
import { calcEndTime } from '@/utils/exam/scheduleHelpers'

const $q = useQuasar()
const { printing, print } = useBeritaAcaraPrint()

const schedulesRaw = ref([])
const examTypes = ref([])
const loading = ref(false)
const selected = ref([])

const filters = ref({
  tanggal: '',
  ruang: null,
  jenis_ujian_id: null,
})

const columns = [
  { name: 'tanggal', label: 'Tanggal', field: 'tanggal', align: 'left', style: 'min-width: 130px' },
  { name: 'jam', label: 'Jam', field: 'jam_mulai', align: 'left', style: 'min-width: 120px' },
  { name: 'ruang', label: 'Ruang', field: 'ruang_nama', align: 'center', style: 'width: 90px' },
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'min-width: 120px' },
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left' },
  { name: 'pengawas', label: 'Pengawas', field: 'pengawas_namas', align: 'left', style: 'min-width: 180px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 70px' },
]

// ── Flatten: 1 row per (jadwal × detail kelas)
const rows = computed(() => {
  const out = []
  schedulesRaw.value.forEach((s) => {
    const details = Array.isArray(s.details) ? s.details : []
    if (details.length === 0) {
      out.push({
        _key: `${s.id}-no-detail`,
        schedule_id: s.id,
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
        schedule_id: s.id,
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
  return out.sort((a, b) => {
    const t = (a.tanggal || '').localeCompare(b.tanggal || '')
    if (t !== 0) return t
    const j = (a.jam_mulai || '').localeCompare(b.jam_mulai || '')
    if (j !== 0) return j
    return (a.ruang_nama || '').localeCompare(b.ruang_nama || '')
  })
})

const filteredRows = computed(() => {
  if (!filters.value.ruang) return rows.value
  return rows.value.filter((r) => r.ruang_nama === filters.value.ruang)
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

const uniqueKelas = computed(() => {
  const set = new Set()
  rows.value.forEach((r) => {
    if (r.class_id) set.add(r.class_id)
  })
  return set.size
})

const emptyAssign = computed(
  () =>
    rows.value.filter((r) => !r.pengawas_namas || r.pengawas_namas.length === 0).length,
)

const fmtShortDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtHari = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long' })
}

// ── Build items untuk print
const rowToItem = (r) => ({
  detail: {
    class_id: r.class_id,
    class_nama: r.class_nama,
    ruang_id: r.ruang_id,
    ruang_nama: r.ruang_nama,
    pengawas_ids: r.pengawas_ids,
    pengawas_namas: r.pengawas_namas,
  },
  schedule: {
    id: r.schedule_id,
    tanggal: r.tanggal,
    jam_mulai: r.jam_mulai,
    durasi_menit: r.durasi_menit,
    subject_nama: r.subject_nama,
  },
})

// ── Handlers
const loadRefs = async () => {
  try {
    const res = await ExamTypeService.list()
    examTypes.value = res.data?.data || res.data || []
  } catch (e) {
    console.warn('[BeritaAcara] loadExamTypes failed', e)
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
    console.error('[BeritaAcara] reload failed', e)
    schedulesRaw.value = []
  } finally {
    loading.value = false
  }
}

const onPrintSingle = async (r) => {
  const res = await print({ items: [rowToItem(r)], mode: 'open' })
  if (!res.success) {
    $q.notify({ type: 'warning', message: res.message || 'Gagal cetak' })
  }
}

const onPrintSelected = async (mode) => {
  const items = selected.value.map(rowToItem)
  const res = await print({ items, mode })
  if (!res.success) {
    $q.notify({ type: 'warning', message: res.message || 'Gagal cetak' })
  } else if (mode === 'download') {
    $q.notify({ type: 'positive', message: `PDF (${res.count} BA) berhasil diunduh` })
  }
}

onMounted(async () => {
  await loadRefs()
  reload()
})
</script>
