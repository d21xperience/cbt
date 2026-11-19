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
      <q-btn flat color="grey-7" icon="tune" label="Pengaturan" @click="settingsDialog = true" class="q-ml-sm" />
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
          <span v-if="props.row.device_fingerprint" class="text-caption text-positive">Terikat</span>
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
            map-options outlined dense :loading="loadingRefs" />
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

    <!-- Dialog Pengaturan Cetak -->
    <q-dialog v-model="settingsDialog">
      <q-card style="min-width: 450px">
        <q-card-section class="text-h6">Pengaturan Cetak Kartu</q-card-section>
        <q-card-section class="q-gutter-md">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-select v-model="printSettings.paper_size" :options="['A4', 'A5', 'A6', 'Letter']" label="Ukuran Kertas" outlined dense />
            </div>
            <div class="col-6">
              <q-select v-model="printSettings.orientation" :options="['portrait', 'landscape']" label="Orientasi" outlined dense />
            </div>
          </div>

          <q-separator />

          <div class="text-subtitle2 q-mt-sm">Ukuran Kartu</div>
          <q-select 
            v-model="printSettings.card_preset" 
            :options="['ID-1 (ATM/KTP)', 'ID-2 (Paspor)', 'Custom']" 
            label="Preset Ukuran" 
            outlined dense 
            @update:model-value="applyPreset"
          />
          
          <div class="row q-col-gutter-sm" v-if="printSettings.card_preset === 'Custom'">
            <div class="col-6">
              <q-input v-model.number="printSettings.card_width" type="number" step="0.1" label="Lebar (mm)" outlined dense />
            </div>
            <div class="col-6">
              <q-input v-model.number="printSettings.card_height" type="number" step="0.1" label="Tinggi (mm)" outlined dense />
            </div>
          </div>
          <div v-else class="text-caption text-grey-7">
            Ukuran: {{ printSettings.card_width }}mm x {{ printSettings.card_height }}mm
          </div>

          <q-toggle v-model="printSettings.center_cards" label="Rata Tengah Otomatis (Hilangkan ruang kosong kanan)" />

          <q-separator />

          <div class="text-subtitle2">Margin Halaman (mm)</div>
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model.number="printSettings.margin_top" type="number" label="Atas" outlined dense /></div>
            <div class="col-6"><q-input v-model.number="printSettings.margin_bottom" type="number" label="Bawah" outlined dense /></div>
            <div class="col-6"><q-input v-model.number="printSettings.margin_left" type="number" label="Kiri" outlined dense /></div>
            <div class="col-6"><q-input v-model.number="printSettings.margin_right" type="number" label="Kanan" outlined dense /></div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Simpan" :loading="savingSettings" @click="savePrintSettings" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAcademicStore } from '@/stores/academic'
import { ExamCardService } from '@/services/admin/ExamCardService'
import { StudentService } from '@/services/admin/StudentService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { useExamCardPrint } from '@/composables/admin/useExamCardPrint'
import { getTenantSlug } from '@/utils/tenant'
import { PrintSettingsService } from '@/services/admin/PrintSettingsService'


const $q = useQuasar()
const academicStore = useAcademicStore()
const { printing, printCards } = useExamCardPrint()

// ── State
const rows = ref([])
const selected = ref([])
const loading = ref(false)
const loadingRefs = ref(false)
const enrichedSchedules = ref([])
const examTypesList = ref([])

// Reference data
const students = ref([])
const schoolProfile = ref({})

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
  students.value
    .filter((s) => s.status === 'AKTIF')
    .map((s) => ({ label: `${s.nama} (${s.kelas_nama})`, value: s.id, ...s })),
)

const classOptions = computed(() => {
  const set = new Map()
  students.value.forEach((s) => {
    if (s.kelas_id) set.set(s.kelas_id, s.kelas_nama)
  })
  return Array.from(set, ([value, label]) => ({ label, value }))
})

const statusColor = (s) =>
  s === 'ACTIVE' ? 'positive' : s === 'EXPIRED' ? 'warning' : 'negative'

const tenantSlug = computed(() => getTenantSlug() || '')

// ✅ Mapping kode exam_mode -> nama lengkap dari Data Referensi
const examModeLabel = computed(() => {
  const mode = academicStore.exam_mode
  if (!mode) return 'UJIAN'
  const found = examTypesList.value.find((t) => t.kode === mode)
  return found ? found.nama : mode
})

// ── Load reference data
const loadReferences = async () => {
  loadingRefs.value = true
  try {
    const [stuRes, schoolRes, scheduleRes, examTypeRes] = await Promise.allSettled([
      StudentService.list(),
      SchoolProfileService.getProfile(),
      ExamScheduleService.list({ params: { academic_period_id: academicStore.active_period_id } }),
      ExamTypeService.list(),
    ])

    if (stuRes.status === 'fulfilled') {
      students.value = stuRes.value.data?.data || stuRes.value.data || []
    }

    if (schoolRes.status === 'fulfilled') {
      const data = schoolRes.value.data?.data || schoolRes.value.data || {}
      // ✅ Fallback nama sekolah (DB tidak punya kolom 'nama', pakai kode_sekolah)
      schoolProfile.value = {
        ...data,
        nama: data.nama || data.nama_sekolah || data.kode_sekolah || 'SEKOLAH',
      }
    }

    if (scheduleRes.status === 'fulfilled') {
      const rawData = scheduleRes.value.data?.data || scheduleRes.value.data || []
      enrichedSchedules.value = Array.isArray(rawData) ? rawData : []
    }

    if (examTypeRes.status === 'fulfilled') {
      const rawData = examTypeRes.value.data?.data || examTypeRes.value.data || []
      examTypesList.value = Array.isArray(rawData) ? rawData : []
    }
  } finally {
    loadingRefs.value = false
  }
}

// ── Load cards
const reload = async () => {
  loading.value = true
  try {
    const res = await ExamCardService.list({
      search: filters.value.search || undefined,
      card_type: filters.value.card_type === 'SEMUA' ? undefined : filters.value.card_type,
      status: filters.value.status === 'SEMUA' ? undefined : filters.value.status,
      class_id: filters.value.class_id || undefined,
      period_id: academicStore.active_period_id || undefined,
    })
    // ✅ PARSER TANGGUH: terima array LANGSUNG ATAU objek {cards}
    const raw = res.data?.data
    const data = Array.isArray(raw) ? raw : (raw?.cards || [])
    rows.value = Array.isArray(data) ? data : []
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Gagal memuat kartu: ' + (err.message || err) })
  } finally {
    loading.value = false
  }
}
const applyPreset = (preset) => {
  printSettings.value.card_preset = preset
  if (preset === 'ID-1 (ATM/KTP)') {
    printSettings.value.card_width = 85.6
    printSettings.value.card_height = 53.98
  } else if (preset === 'ID-2 (Paspor)') {
    printSettings.value.card_width = 105
    printSettings.value.card_height = 74
  }
}

const loadPrintSettings = async () => {
  try {
    const res = await PrintSettingsService.get()
    if (res.data.status === 'ok') {
      printSettings.value = { ...printSettings.value, ...res.data.data }
    }
  } catch (err) {
    console.warn('Gagal memuat pengaturan cetak, menggunakan default', err)
  }
}

const savePrintSettings = async () => {
  savingSettings.value = true
  try {
    await PrintSettingsService.update(printSettings.value)
    $q.notify({ type: 'positive', message: 'Pengaturan cetak berhasil disimpan' })
    settingsDialog.value = false
  } catch (err) {
    $q.notify({ type: 'negative', message: `Gagal menyimpan pengaturan ${err}` })
  } finally {
    savingSettings.value = false
  }
}
// ── Print
const onPrintSingle = async (card) => {
  await printCards({
    cards: [card],
    school: schoolProfile.value,
    tenant: tenantSlug.value,
    exams: enrichedSchedules.value,
    examMode: examModeLabel.value,
    settings: printSettings.value,
    mode: 'open',
  })
}

const onPrintSelected = async () => {
  await printCards({
    cards: selected.value,
    school: schoolProfile.value,
    tenant: tenantSlug.value,
    exams: enrichedSchedules.value,
    examMode: examModeLabel.value,
    settings: printSettings.value,
    mode: 'open',
  })
}

const onDownloadSelected = async () => {
  await printCards({
    cards: selected.value,
    school: schoolProfile.value,
    tenant: tenantSlug.value,
    exams: enrichedSchedules.value,
    examMode: examModeLabel.value,
    settings: printSettings.value,
    mode: 'download',
  })
}


// ── Device & Revoke
const onResetDevice = (card) => {
  $q.dialog({
    title: 'Reset Device Binding',
    message: `Reset ikatan device untuk ${card.student_name}? Siswa harus scan ulang QR dari device baru.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await ExamCardService.resetDevice(card.student_nis)
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
      await ExamCardService.revoke(card.student_nis)
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
  const s = students.value.find((x) => x.id === form.value.student)
  if (!s) {
    $q.notify({ type: 'negative', message: 'Data siswa tidak ditemukan' })
    return
  }
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

const settingsDialog = ref(false)
const printSettings = ref({
  paper_size: 'A4',
  orientation: 'portrait',
  margin_top: 20,
  margin_right: 20,
  margin_bottom: 40,
  margin_left: 20,
  card_width: 85.6,
  card_height: 53.98,
  center_cards: true,
  card_preset: 'ID-1 (ATM/KTP)'
})
const savingSettings = ref(false)


onMounted(async () => {
  await loadReferences()
  await loadPrintSettings()
  reload()
})
</script>
