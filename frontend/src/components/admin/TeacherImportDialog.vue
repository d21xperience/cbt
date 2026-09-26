<template>
  <q-dialog v-model="isOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card>
      <q-bar class="bg-primary text-white">
        <div class="text-subtitle1">Import Guru</div>
        <q-space />
        <q-btn dense flat icon="close" @click="onClose" />
      </q-bar>

      <q-card-section>
        <q-stepper v-model="step" color="primary" animated flat>
          <q-step :name="1" title="Upload File" icon="upload_file" :done="step > 1">
            <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
              <template v-slot:avatar>
                <q-icon name="info" color="primary" />
              </template>
              Format CSV: <code>nip,nama,email,username,password,status</code>
              <br />
              Mapel diampu tidak di-import via CSV — atur setelah import via Edit.
            </q-banner>

            <q-btn outline color="primary" icon="download" label="Download Template CSV" no-caps class="q-mb-md"
              :loading="downloadingTemplate" @click="onDownloadTemplate('csv')" />

            <q-form @submit.prevent="onUploadStep" class="q-gutter-md">
              <q-file v-model="fileRef" label="File CSV" accept=".csv" outlined
                :rules="[(v) => !!v || 'File wajib dipilih']">
                <template v-slot:prepend><q-icon name="attach_file" /></template>
              </q-file>

              <div class="row q-gutter-sm">
                <q-btn type="submit" color="primary" label="Lanjut ke Preview" :loading="importing" />
                <q-btn flat color="grey" label="Batal" @click="onClose" />
              </div>
            </q-form>
          </q-step>

          <q-step :name="2" title="Preview & Validasi" icon="visibility">
            <q-table :rows="importPreview" :columns="previewColumns" row-key="_rowNumber" flat bordered dense>
              <template v-slot:body-cell-_error="props">
                <q-td :props="props">
                  <q-badge v-if="props.row._error" color="negative" :label="props.row._error" />
                  <q-icon v-else name="check_circle" color="positive" />
                </q-td>
              </template>
            </q-table>

            <div class="row q-gutter-sm q-mt-md">
              <q-btn color="primary" flat label="Kembali" @click="step = 1" />
              <q-btn color="positive" :label="`Import ${importValidCount} Guru`" :disable="importValidCount === 0"
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

const props = defineProps({
  modelValue: Boolean,
  importStep: { type: Number, default: 1 },
  importPreview: { type: Array, default: () => [] },
  importing: Boolean,
  downloadingTemplate: Boolean,
  importValidCount: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue', 'update:importStep', 'download-template', 'parse-import', 'confirm-import', 'close'])

const isOpen = ref(false)
const step = ref(1)
const fileRef = ref(null)

const previewColumns = [
  { name: '_rowNumber', label: 'Baris', field: '_rowNumber', align: 'center', style: 'width: 70px' },
  { name: 'nip', label: 'NIP', field: 'nip', align: 'left' },
  { name: 'nama', label: 'Nama', field: 'nama', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'username', label: 'Username', field: 'username', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: '_error', label: 'Status', field: '_error', align: 'center' },
]

watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) { step.value = props.importStep || 1; fileRef.value = null }
})
watch(isOpen, (val) => emit('update:modelValue', val))
watch(step, (val) => emit('update:importStep', val))

const onDownloadTemplate = (f) => emit('download-template', f)
const onUploadStep = () => emit('parse-import', fileRef.value)
const onConfirmImport = () => emit('confirm-import')
const onClose = () => emit('close')
</script>
