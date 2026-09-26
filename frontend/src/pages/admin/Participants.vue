<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="text-h4 col">
        <q-icon name="group" color="primary" size="md" class="q-mr-sm" />
        Data Peserta
      </div>
      <q-btn color="primary" icon="upload_file" label="Import Peserta" @click="openImportDialog" />
    </div>

    <!-- Error banner -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Endpoint data peserta belum tersedia di backend (Phase 6). Menampilkan data mock.
    </q-banner>
    <q-banner v-else-if="errorState === 'network_error'" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="wifi_off" color="orange" />
      </template>
      Koneksi terputus. Data terakhir tetap ditampilkan.
    </q-banner>
    <q-banner v-else-if="errorState === 'server_error'" dense rounded class="bg-red-1 text-red-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="error" color="red" />
      </template>
      Server error. Klik refresh untuk coba lagi.
    </q-banner>

    <!-- Filter -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-select v-model="filterExamId" :options="examOptions" label="Filter Ujian" outlined dense emit-value
              map-options clearable />
          </div>
          <div class="col-12 col-md-3">
            <q-select v-model="filterSource" :options="sourceOptions" label="Filter Sumber" outlined dense emit-value
              map-options clearable />
          </div>
          <div class="col-12 col-md-5">
            <q-input v-model="filterSearch" label="Cari Nama / NISN" outlined dense clearable>
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </div>
        <div class="text-caption text-grey-7 q-mt-sm">
          Menampilkan <b>{{ filteredParticipants.length }}</b> dari
          {{ participants.length }} peserta
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card>
      <q-table :rows="filteredParticipants" :columns="columns" row-key="id" flat bordered :loading="loading"
        no-data-label="Belum ada data peserta">
        <template v-slot:body-cell-nisn="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nisn || '-' }}</div>
            <div class="text-caption text-grey-6">
              {{ props.row.participant_id || '-' }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-class="props">
          <q-td :props="props">
            <q-chip dense outline color="blue" icon="school" size="sm">
              {{ props.row.class || props.row.rombel || '-' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-source="props">
          <q-td :props="props">
            <q-badge :color="props.row.source === 'SIAKAD' ? 'primary' : 'orange'" :label="props.row.source" />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn v-if="props.row.source === 'EXTERNAL'" flat round dense icon="delete" color="negative"
              @click="confirmDelete(props.row)">
              <q-tooltip>Hapus peserta</q-tooltip>
            </q-btn>
            <span v-else class="text-caption text-grey-6">
              <q-icon name="lock" size="16px" /> SIAKAD
            </span>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Import Dialog -->
    <q-dialog v-model="showImportDialog" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card>
        <q-bar class="bg-primary text-white">
          <div class="text-subtitle1">Import Peserta Eksternal</div>
          <q-space />
          <q-btn dense flat icon="close" @click="closeImportDialog" />
        </q-bar>

        <q-card-section>
          <q-stepper v-model="step" color="primary" animated flat>
            <!-- Step 1 — Upload -->
            <q-step :name="1" title="Upload CSV" icon="upload_file" :done="step > 1">
              <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
                <template v-slot:avatar>
                  <q-icon name="info" color="primary" />
                </template>
                Format CSV: <code>participant_id,nisn,name,class</code>
              </q-banner>

              <q-form @submit.prevent="onUploadStep" class="q-gutter-md">
                <q-file v-model="importFile" label="File CSV" accept=".csv" outlined
                  :rules="[(val) => !!val || 'File CSV wajib dipilih']">
                  <template v-slot:prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>

                <div class="row q-gutter-sm">
                  <q-btn type="submit" color="primary" label="Lanjut ke Preview" :loading="isImporting" />
                  <q-btn flat color="grey" label="Batal" @click="closeImportDialog" />
                </div>
              </q-form>
            </q-step>

            <!-- Step 2 — Preview -->
            <q-step :name="2" title="Preview & Validasi" icon="visibility">
              <q-banner v-if="importErrors.length > 0" dense rounded class="bg-negative text-white q-mb-md">
                <template v-slot:avatar>
                  <q-icon name="error" />
                </template>
                <b>{{ importErrors.length }} error ditemukan:</b>
                <ul class="q-mb-none">
                  <li v-for="(err, idx) in importErrors.slice(0, 5)" :key="idx">
                    Baris {{ err.row }}: {{ err.message }}
                  </li>
                </ul>
              </q-banner>

              <q-table :rows="importPreview" :columns="previewColumns" row-key="_rowNumber" flat bordered dense
                :rows-per-page-options="[10, 25, 50]">
                <template v-slot:body-cell-_error="props">
                  <q-td :props="props">
                    <q-badge v-if="props.row._error" color="negative" :label="props.row._error" />
                    <q-icon v-else name="check_circle" color="positive" />
                  </q-td>
                </template>
              </q-table>

              <div class="row q-gutter-sm q-mt-md">
                <q-btn color="primary" label="Kembali" flat @click="step = 1" />
                <q-btn color="positive" :label="`Import ${validCount} Peserta`" :disable="validCount === 0"
                  :loading="isImporting" @click="onConfirmImport" />
                <q-btn flat color="grey" label="Batal" @click="closeImportDialog" />
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useParticipants } from '@/composables/admin/useParticipants'

const $q = useQuasar()

const {
  participants,
  loading,
  errorState,
  filterExamId,
  filterSource,
  filterSearch,
  filteredParticipants,
  examOptions,
  sourceOptions,
  importPreview,
  importErrors,
  validCount,
  isImporting,
  deleteParticipant,
  parseImport,
  confirmImport,
  resetImport,
} = useParticipants()

// ── Local UI state
const showImportDialog = ref(false)
const step = ref(1)
const importFile = ref(null)

const columns = [
  { name: 'nisn', label: 'NISN / ID', field: 'nisn', align: 'left', style: 'min-width: 140px' },
  { name: 'name', label: 'Nama', field: 'name', align: 'left', style: 'min-width: 180px' },
  { name: 'class', label: 'Kelas', field: 'class', align: 'left', style: 'width: 140px' },
  { name: 'source', label: 'Sumber', field: 'source', align: 'center', style: 'width: 110px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 100px' },
]

const previewColumns = [
  { name: '_rowNumber', label: 'Baris', field: '_rowNumber', align: 'center', style: 'width: 70px' },
  { name: 'participant_id', label: 'ID Peserta', field: 'participant_id', align: 'left' },
  { name: 'nisn', label: 'NISN', field: 'nisn', align: 'left' },
  { name: 'name', label: 'Nama', field: 'name', align: 'left' },
  { name: 'class', label: 'Kelas', field: 'class', align: 'left' },
  { name: '_error', label: 'Status', field: '_error', align: 'center' },
]

// ── Handlers
const openImportDialog = () => {
  showImportDialog.value = true
  step.value = 1
  importFile.value = null
  resetImport()
}

const closeImportDialog = () => {
  showImportDialog.value = false
  step.value = 1
  importFile.value = null
  resetImport()
}

const onUploadStep = async () => {
  const res = await parseImport(importFile.value, {})
  if (res.success) {
    step.value = 2
    $q.notify({
      type: res.invalid > 0 ? 'warning' : 'positive',
      message: `Berhasil parse ${res.total} baris (${res.valid} valid, ${res.invalid} error)`,
      timeout: 3000,
    })
  }
}

const onConfirmImport = async () => {
  const res = await confirmImport({})
  if (res.success) {
    closeImportDialog()
  }
}

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus peserta <b>${row.name}</b> (${row.nisn || row.participant_id})?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteParticipant(row)
  })
}

onMounted(() => {
  // Composable sudah handle onMounted — biarkan empty
})
</script>
