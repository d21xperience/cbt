<!-- src/pages/admin/cetak/KartuUjianPrint.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" @click="$router.back()" class="q-mr-sm" />
      <div>
        <div class="text-h6">Kartu Ujian</div>
        <div class="text-caption text-grey-7">
          Cetak kartu login + QR (opaque). 10 kartu per lembar A4.
        </div>
      </div>
      <q-space />
      <q-btn color="primary" icon="print" label="Cetak Terpilih" :disable="selected.length === 0 || printing"
        :loading="printing" @click="onPrintSelected" />
      <q-btn flat color="primary" icon="picture_as_pdf" label="Unduh PDF" class="q-ml-sm"
        :disable="selected.length === 0 || printing" @click="onDownloadSelected" />
    </div>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-3">
          <q-input v-model="filters.search" dense outlined label="Cari (nama / NIS / No. Kartu)" debounce="300"
            @update:model-value="reload">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filters.card_type" dense outlined label="Tipe Kartu" :options="typeOptions" emit-value
            map-options @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filters.status" dense outlined label="Status" :options="statusOptions" emit-value
            map-options @update:model-value="reload" />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filters.class_id" dense outlined label="Kelas (opsional)" :options="classOptions"
            emit-value map-options clearable />
        </div>
        <div class="col-12 col-md-2 text-right">
          <q-btn flat icon="refresh" label="Muat Ulang" @click="reload" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-table :rows="rows" :columns="columns" row-key="id" flat bordered dense :loading="loading"
      v-model:selected="selected" selection="multiple">
      <template #body-cell-card_type="props">
        <q-td :props="props">
          <q-badge :color="props.row.card_type === 'PERMANENT' ? 'primary' : 'warning'" :label="props.row.card_type" />
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
        </q-td>
      </template>
      <template #body-cell-device="props">
        <q-td :props="props">
          <span v-if="props.row.device_fingerprint" class="text-caption text-positive">
            Terikat
          </span>
          <span v-else class="text-caption text-grey-6">—</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn flat round dense icon="print" color="primary" @click="onPrintSingle(props.row)">
            <q-tooltip>Cetak</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="phonelink_erase" color="deep-orange" :disable="!props.row.device_fingerprint"
            @click="onResetDevice(props.row)">
            <q-tooltip>Reset Device Binding</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="block" color="negative" :disable="props.row.status !== 'ACTIVE'"
            @click="onRevoke(props.row)">
            <q-tooltip>Cabut Kartu</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- Dialog create -->
    <q-dialog v-model="createOpen">
      <q-card style="min-width: 420px">
        <q-card-section class="text-h6">Buat Kartu Baru</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="form.student" :options="studentOptions" label="Pilih Siswa" option-label="label" emit-value
            map-options outlined dense />
          <q-select v-model="form.card_type" :options="typeOptions" label="Tipe Kartu" emit-value map-options outlined
            dense />
          <template v-if="form.card_type === 'TEMPORARY'">
            <q-input v-model="form.expiry_date" type="date" label="Berlaku s/d" outlined dense />
            <q-input v-model="form.reason" label="Alasan (tunggakan)" outlined dense />
          </template>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Buat" :loading="creating" @click="onCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-page-sticky position="bottom-right" :offset="[24, 24]">
      <q-btn fab icon="add" color="primary" @click="createOpen = true">
        <q-tooltip>Buat Kartu Baru</q-tooltip>
      </q-btn>
    </q-page-sticky>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ExamCardService } from '@/services/admin/ExamCardService'
import { useExamCardPrint } from '@/composables/admin/useExamCardPrint'
import { mockStudents } from '@/mocks/data/studentsData'
import { mockSchoolProfiles } from '@/mocks/data/schoolProfileData'
import { getTenantSlug } from '@/utils/tenant'
import { mockExamsFull } from '@/mocks/data/examsData'

const $q = useQuasar()
const { printing, printCards } = useExamCardPrint()

const rows = ref([])
const selected = ref([])
const loading = ref(false)
const examsForPrint = computed(() => mockExamsFull)

const filters = ref({
  search: '',
  card_type: 'SEMUA',
  status: 'SEMUA',
  class_id: null,
})

const typeOptions = [
  { label: 'Semua', value: 'SEMUA' },
  { label: 'Permanent', value: 'PERMANENT' },
  { label: 'Sementara', value: 'TEMPORARY' },
]
const statusOptions = [
  { label: 'Semua', value: 'SEMUA' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Dicabut', value: 'REVOKED' },
]

const columns = [
  { name: 'card_number', label: 'No. Kartu', field: 'card_number', align: 'left', sortable: true },
  { name: 'student_name', label: 'Siswa', field: 'student_name', align: 'left', sortable: true },
  { name: 'student_nis', label: 'NIS', field: 'student_nis', align: 'left' },
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left' },
  { name: 'card_type', label: 'Tipe', field: 'card_type', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'device', label: 'Device', field: 'device_fingerprint', align: 'center' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'center' },
]

const studentOptions = computed(() =>
  mockStudents
    .filter((s) => s.status === 'AKTIF')
    .map((s) => ({ label: `${s.nama} (${s.kelas_nama})`, value: s.id, ...s })),
)

const classOptions = computed(() => {
  const set = new Map()
  mockStudents.forEach((s) => set.set(s.kelas_id, s.kelas_nama))
  return Array.from(set, ([value, label]) => ({ label, value }))
})

const statusColor = (s) =>
  s === 'ACTIVE' ? 'positive' : s === 'EXPIRED' ? 'warning' : 'negative'

const tenantSlug = computed(() => getTenantSlug() || 'smkpasja')
const schoolProfile = computed(() => mockSchoolProfiles[tenantSlug.value] || {})

const reload = async () => {
  loading.value = true
  try {
    const res = await ExamCardService.list({
      search: filters.value.search || undefined,
      card_type: filters.value.card_type === 'SEMUA' ? undefined : filters.value.card_type,
      status: filters.value.status === 'SEMUA' ? undefined : filters.value.status,
    })
    const data = res.data?.data || []
    rows.value = filters.value.class_id
      ? data.filter((c) => c.class_id === filters.value.class_id)
      : data
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Gagal memuat kartu: ' + (err.message || err) })
  } finally {
    loading.value = false
  }
}

const onPrintSingle = async (card) => {
  await printCards({
    cards: [card],
    school: schoolProfile.value,
    tenant: tenantSlug.value,
    exams: examsForPrint.value,
    mode: 'open',
  })
}

const onPrintSelected = async () => {
  await printCards({
    cards: selected.value,
    school: schoolProfile.value,
    tenant: tenantSlug.value,
    exams: examsForPrint.value,
    mode: 'open',
  })
}


const onDownloadSelected = async () => {
  await printCards({
    cards: selected.value,
    school: schoolProfile.value,
    tenant: tenantSlug.value,
    exams: examsForPrint.value,
    mode: 'download',
  })
}

const onResetDevice = (card) => {
  $q.dialog({
    title: 'Reset Device Binding',
    message: `Reset ikatan device untuk ${card.student_name}? Siswa harus scan ulang QR dari device baru.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await ExamCardService.resetDevice(card.id)
      $q.notify({ type: 'positive', message: 'Device binding direset' })
      reload()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Gagal reset: ' + (err.message || err) })
    }
  })
}

const onRevoke = (card) => {
  $q.dialog({
    title: 'Cabut Kartu',
    message: `Cabut kartu ${card.card_number} (${card.student_name})? QR akan langsung invalid.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await ExamCardService.revoke(card.id)
      $q.notify({ type: 'positive', message: 'Kartu dicabut' })
      reload()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Gagal cabut: ' + (err.message || err) })
    }
  })
}

// ── Create
const createOpen = ref(false)
const creating = ref(false)
const form = ref({
  student: null,
  card_type: 'PERMANENT',
  expiry_date: '',
  reason: '',
})

const onCreate = async () => {
  if (!form.value.student) {
    $q.notify({ type: 'negative', message: 'Pilih siswa' })
    return
  }
  const s = mockStudents.find((x) => x.id === form.value.student)
  creating.value = true
  try {
    await ExamCardService.create({
      student: s,
      card_type: form.value.card_type,
      expiry_date: form.value.expiry_date || null,
      reason: form.value.reason || null,
    })
    $q.notify({ type: 'positive', message: 'Kartu dibuat' })
    createOpen.value = false
    form.value = { student: null, card_type: 'PERMANENT', expiry_date: '', reason: '' }
    reload()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Gagal buat: ' + (err.message || err) })
  } finally {
    creating.value = false
  }
}

onMounted(reload)
</script>
