<!-- src/pages/admin/ExamManagement.vue -->
<template>
  <q-page padding class="bg-grey-1">
    <!-- Header -->
    <div class="q-mb-lg row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Manajemen Jadwal Ujian</h5>
        <div class="text-caption text-grey-7">
          Pemetaan distribusi waktu ujian per tingkat dan mata pelajaran.
        </div>
      </div>
      <div v-if="viewMode === 'LIST'" class="q-gutter-sm">
        <q-btn outline color="primary" icon="print" label="Cetak Jadwal" no-caps :loading="printing"
          :disable="rows.length === 0" @click="onPrint('open')" />
        <q-btn outline color="primary" icon="picture_as_pdf" label="Unduh PDF" no-caps :loading="printing"
          :disable="rows.length === 0" @click="onPrint('download')" />
        <q-btn color="primary" icon="add" label="Buat Jadwal Baru" no-caps @click="startWizard" />
      </div>
    </div>

    <!-- LIST VIEW -->
    <q-card v-if="viewMode === 'LIST'" flat bordered class="bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="filters.search" dense outlined label="Cari mapel" debounce="300"
            @update:model-value="reload">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filters.jenis_ujian_id" :options="examTypeOptions" dense outlined label="Jenis Ujian"
            emit-value map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filters.tingkat" :options="tingkatOptions" dense outlined label="Tingkat" emit-value
            map-options clearable @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-3">
          <q-input v-model="filters.tanggal" type="date" dense outlined label="Tanggal" clearable
            @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-1 text-right">
          <q-btn flat round dense icon="refresh" @click="reload">
            <q-tooltip>Muat ulang</q-tooltip>
          </q-btn>
        </div>
      </q-card-section>

      <q-separator />

      <q-table :rows="rows" :columns="columns" row-key="id" flat :loading="loading" no-data-label="Belum ada jadwal"
        :pagination="{ rowsPerPage: 20 }">
        <template #body-cell-tanggal="props">
          <q-td :props="props">
            <div>{{ formatTanggal(props.row.tanggal) }}</div>
            <div class="text-caption text-grey-7">{{ dayName(props.row.tanggal) }}</div>
          </q-td>
        </template>
        <template #body-cell-jam="props">
          <q-td :props="props">
            <div>
              {{ props.row.jam_mulai }} – {{ calcEndTime(props.row.jam_mulai, props.row.durasi_menit) }}
            </div>
            <div class="text-caption text-grey-7">{{ props.row.durasi_menit }} menit</div>
          </q-td>
        </template>
        <template #body-cell-tingkat="props">
          <q-td :props="props" class="text-center">
            <q-badge color="primary" :label="`Tingkat ${props.row.tingkat}`" />
          </q-td>
        </template>
        <template #body-cell-subject_nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.subject_nama }}</div>
            <div class="text-caption text-grey-7">{{ props.row.subject_kode }}</div>
          </q-td>
        </template>
        <template #body-cell-kelas_count="props">
          <q-td :props="props" class="text-center">
            <q-chip dense outline color="primary" icon="groups" size="sm">
              {{ (props.row.details || []).length }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-pengawas_summary="props">
          <q-td :props="props">
            <div v-if="getUniquePengawas(props.row).length === 0" class="text-caption text-grey-6 italic">
              Belum di-assign
            </div>
            <div v-else>
              <span v-for="(nama, idx) in getUniquePengawas(props.row).slice(0, 3)" :key="idx">
                <q-chip dense outline color="teal" size="sm" icon="person" class="q-mr-xs q-mb-xs">
                  {{ nama }}
                </q-chip>
              </span>
              <q-chip v-if="getUniquePengawas(props.row).length > 3" dense color="grey-4" size="sm">
                +{{ getUniquePengawas(props.row).length - 3 }} lainnya
              </q-chip>
            </div>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center" style="white-space: nowrap">
            <q-btn flat round dense icon="visibility" color="primary" size="sm" @click="openDetail(props.row)">
              <q-tooltip>Lihat detail kelas & pengawas</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEdit(props.row)">
              <q-tooltip>Edit jadwal</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(props.row)">
              <q-tooltip>Hapus</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- WIZARD VIEW -->
    <ExamScheduleWizard v-if="viewMode === 'WIZARD'" :jenjang="schoolJenjang" :duration-years="programDurationYears"
      @cancel="viewMode = 'LIST'" @saved="onWizardSaved" />

    <ExamScheduleEditDialog v-model="editOpen" :row="editRow" @saved="onEditSaved" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { calcEndTime } from '@/utils/exam/scheduleHelpers'
import { useTenant } from '@/composables/super/useTenant'
import { getGradeOptionsForJenjang } from '@/domain/school/jenjang'
import ExamScheduleWizard from '@/components/admin/ExamScheduleWizard.vue'
import { useExamSchedulePrint } from '@/composables/admin/useExamSchedulePrint'
import ExamScheduleEditDialog from '@/components/admin/ExamScheduleEditDialog.vue'

const $q = useQuasar()
const { jenjang: schoolJenjang, programDurationYears, loadTenantConfig } = useTenant()
const { printing, print } = useExamSchedulePrint()

const viewMode = ref('LIST')
const loading = ref(false)
const rows = ref([])
const filters = ref({
  search: '',
  jenis_ujian_id: null,
  tingkat: null,
  tanggal: '',
})

const examTypes = ref([])
const examTypeOptions = computed(() =>
  examTypes.value.map((t) => ({ label: `${t.kode} — ${t.nama}`, value: t.id })),
)

const loadExamTypes = async () => {
  try {
    const res = await ExamTypeService.list()
    examTypes.value = res.data?.data || res.data || []
  } catch (e) {
    console.warn('[ExamManagement] loadExamTypes failed', e)
    examTypes.value = []
  }
}
const tingkatOptions = computed(() =>
  getGradeOptionsForJenjang(schoolJenjang.value, programDurationYears.value).map((o) => ({
    label: o.label,
    value: o.value,
  })),
)
const editOpen = ref(false)
const editRow = ref(null)
const columns = [
  { name: 'tanggal', label: 'Tanggal', field: 'tanggal', align: 'left', style: 'min-width: 140px' },
  { name: 'jam', label: 'Jam', field: 'jam_mulai', align: 'left', style: 'min-width: 160px' },
  { name: 'tingkat', label: 'Tingkat', field: 'tingkat', align: 'center', style: 'width: 100px' },
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left' },
  { name: 'kelas_count', label: 'Kelas', field: 'kelas_count', align: 'center', style: 'width: 90px' },
  { name: 'pengawas_summary', label: 'Pengawas', field: 'pengawas_summary', align: 'left', style: 'min-width: 200px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const formatTanggal = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const dayName = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' })
}

const reload = async () => {
  loading.value = true
  try {
    const res = await ExamScheduleService.list({
      search: filters.value.search || undefined,
      jenis_ujian_id: filters.value.jenis_ujian_id || undefined,
      tingkat: filters.value.tingkat || undefined,
      tanggal: filters.value.tanggal || undefined,
    })
    rows.value = res.data?.data || []
  } catch (e) {
    console.error('[ExamManagement] load failed', e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

const startWizard = () => {
  viewMode.value = 'WIZARD'
}

const onWizardSaved = () => {
  viewMode.value = 'LIST'
  reload()
}

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Hapus Jadwal',
    message: `Hapus jadwal <b>${row.subject_nama}</b> tingkat ${row.tingkat}?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await ExamScheduleService.remove(row.id)
      $q.notify({ type: 'positive', message: 'Jadwal dihapus' })
      reload()
    } catch (e) {
      $q.notify({ type: 'negative', message: `Gagal menghapus \n ${e}` })
    }
  })
}
const onPrint = async (mode) => {
  const res = await print({
    filters: {
      search: filters.value.search || undefined,
      jenis_ujian_id: filters.value.jenis_ujian_id || undefined,
      tingkat: filters.value.tingkat || undefined,
      tanggal: filters.value.tanggal || undefined,
    },
    mode,
  })
  if (!res.success) {
    $q.notify({ type: 'warning', message: res.message || 'Gagal cetak' })
  } else if (mode === 'download') {
    $q.notify({ type: 'positive', message: `PDF jadwal (${res.count} baris) berhasil diunduh` })
  }
}
const getUniquePengawas = (row) => {
  const details = Array.isArray(row.details) ? row.details : []
  const set = new Set()
  details.forEach((d) => {
    (d.pengawas_namas || []).forEach((nama) => {
      if (nama) set.add(nama)
    })
  })
  return Array.from(set)
}

const openEdit = (row) => {
  editRow.value = row
  editOpen.value = true
}

const onEditSaved = () => {
  editOpen.value = false
  editRow.value = null
  reload()
}
onMounted(async () => {
  await Promise.all([loadTenantConfig(), loadExamTypes()])
  reload()
})
</script>
