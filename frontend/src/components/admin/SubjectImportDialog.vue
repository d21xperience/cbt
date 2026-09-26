<template>
  <q-dialog v-model="isOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card>
      <q-bar class="bg-primary text-white">
        <div class="text-subtitle1">Import Mata Pelajaran</div>
        <q-space />
        <q-btn dense flat icon="close" @click="onClose" />
      </q-bar>

      <q-card-section>
        <q-stepper v-model="step" color="primary" animated flat>
          <!-- ═══ Step 1 — Upload ═══ -->
          <q-step :name="1" title="Upload File" icon="upload_file" :done="step > 1">
            <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
              <template v-slot:avatar>
                <q-icon name="info" color="primary" />
              </template>
              Format CSV: <code>kode,nama,nama_singkat,kelompok,tingkat,jurusan_kode</code>
              <br />
              Kolom <b>jurusan_kode</b> hanya diisi untuk kelompok <b>KEJURUAN</b>.
            </q-banner>

            <q-btn outline color="primary" icon="download" label="Download Template CSV" no-caps class="q-mb-md"
              :loading="downloadingTemplate" @click="onDownloadTemplate('csv')" />

            <!-- Drop Zone -->
            <div class="drop-zone" :class="{ 'drop-zone--active': isDragOver, 'drop-zone--has-file': !!selectedFile }"
              @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false" @drop.prevent="onDrop"
              @click="triggerFileInput">
              <input ref="fileInputRef" type="file" accept=".csv" hidden @change="onFileChange" />

              <template v-if="!selectedFile">
                <q-icon name="cloud_upload" size="64px" color="primary" />
                <div class="text-h6 q-mt-md">Drag & Drop file CSV di sini</div>
                <div class="text-caption text-grey-6 q-mt-sm">atau klik untuk memilih file</div>
              </template>

              <template v-else>
                <q-icon name="insert_drive_file" size="48px" color="positive" />
                <div class="text-subtitle1 q-mt-md text-weight-medium">
                  {{ selectedFile.name }}
                </div>
                <div class="text-caption text-grey-6">
                  {{ formatFileSize(selectedFile.size) }}
                </div>
                <q-btn flat color="negative" icon="close" label="Hapus File" size="sm" class="q-mt-sm"
                  @click.stop="clearFile" />
              </template>
            </div>

            <div class="row q-gutter-sm q-mt-md">
              <q-btn type="button" color="primary" label="Lanjut ke Preview" :loading="importing"
                :disable="!selectedFile" @click="onUploadStep" />
              <q-btn flat color="grey" label="Batal" @click="onClose" />
            </div>
          </q-step>

          <!-- ═══ Step 2 — Preview ═══ -->
          <q-step :name="2" title="Preview & Validasi" icon="visibility">
            <q-banner v-if="importErrors.length > 0" dense rounded class="bg-negative text-white q-mb-md">
              <template v-slot:avatar><q-icon name="error" /></template>
              <b>{{ importErrors.length }} error:</b>
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
              <q-btn color="primary" flat label="Kembali" @click="step = 1" />
              <q-btn color="positive" :label="`Import ${importValidCount} Mapel`" :disable="importValidCount === 0"
                :loading="importing" @click="onConfirmImport" />
              <q-btn flat color="grey" label="Batal" @click="onClose" />
            </div>
          </q-step>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
  importStep: { type: Number, default: 1 },
  importPreview: { type: Array, default: () => [] },
  importErrors: { type: Array, default: () => [] },
  importing: Boolean,
  downloadingTemplate: Boolean,
  importValidCount: { type: Number, default: 0 },
})
const emit = defineEmits([
  'update:modelValue',
  'update:importStep',
  'download-template',
  'parse-import',
  'confirm-import',
  'close',
])

const $q = useQuasar()

const isOpen = ref(false)
const step = ref(1)
const selectedFile = ref(null)
const fileInputRef = ref(null)
const isDragOver = ref(false)

const previewColumns = [
  { name: '_rowNumber', label: 'Baris', field: '_rowNumber', align: 'center', style: 'width: 60px' },
  { name: 'kode', label: 'Kode', field: 'kode', align: 'left' },
  { name: 'nama', label: 'Nama', field: 'nama', align: 'left' },
  { name: 'nama_singkat', label: 'Singkat', field: 'nama_singkat', align: 'left' },
  { name: 'kelompok', label: 'Kelompok', field: 'kelompok', align: 'center' },
  { name: 'tingkat', label: 'Tkt', field: 'tingkat', align: 'center' },
  { name: 'jurusan_kode', label: 'Jurusan', field: 'jurusan_kode', align: 'center' },
  { name: '_error', label: 'Status', field: '_error', align: 'center' },
]

// ── Sync dialog state + auto-advance dari parent
watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) {
    step.value = props.importStep || 1
    selectedFile.value = null
    isDragOver.value = false
  }
})
watch(isOpen, (val) => emit('update:modelValue', val))
watch(step, (val) => emit('update:importStep', val))
watch(() => props.importStep, (val) => {
  if (val !== step.value) step.value = val
})

// ── File selection
const validateFile = (file) => {
  if (!file) return false
  if (!file.name.toLowerCase().endsWith('.csv')) {
    $q.notify({ type: 'negative', message: 'Hanya file CSV yang didukung.' })
    return false
  }
  const maxSize = 5 * 1024 * 1024  // 5 MB
  if (file.size > maxSize) {
    $q.notify({ type: 'negative', message: 'Ukuran file maksimal 5 MB.' })
    return false
  }
  return true
}

const onFileChange = (e) => {
  const file = e.target.files?.[0]
  if (validateFile(file)) {
    selectedFile.value = file
  }
}

const onDrop = (e) => {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (validateFile(file)) {
    selectedFile.value = file
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ── Emit actions
const onDownloadTemplate = (format) => emit('download-template', format)
const onUploadStep = () => {
  if (!selectedFile.value) return
  emit('parse-import', selectedFile.value)
}
const onConfirmImport = () => emit('confirm-import')
const onClose = () => emit('close')
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #90caf9;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  background: #f5f9ff;
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.drop-zone:hover {
  background: #eaf3ff;
  border-color: #42a5f5;
}

.drop-zone--active {
  background: #e3f2fd;
  border-color: #1976d2;
  border-style: solid;
  transform: scale(1.01);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
}

.drop-zone--has-file {
  background: #f1f8e9;
  border-color: #66bb6a;
}

.drop-zone--has-file:hover {
  background: #e8f5e9;
  border-color: #43a047;
}
</style>
