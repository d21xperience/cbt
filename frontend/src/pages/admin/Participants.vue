<!-- src/pages/admin/Participants.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h4 col">
        <q-icon name="group" color="primary" size="md" class="q-mr-sm" />
        Data Peserta
      </div>
      <q-btn color="primary" icon="upload_file" label="Import Peserta" @click="showImportDialog = true" />
    </div>

    <!-- Filter -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row q-gutter-md">
          <q-select v-model="filter.exam_id" :options="examOptions" label="Filter Ujian" outlined dense emit-value
            map-options clearable class="col" />
          <q-select v-model="filter.source" :options="sourceOptions" label="Filter Sumber" outlined dense emit-value
            map-options clearable class="col" />
          <q-input v-model="filter.search" label="Cari Nama/NISN" outlined dense clearable class="col">
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card>
      <q-table :rows="filteredParticipants" :columns="columns" row-key="id" flat bordered :loading="loading"
        no-data-label="Belum ada data peserta">
        <template v-slot:body-cell-source="props">
          <q-td :props="props">
            <q-badge :color="props.row.source === 'SIAKAD' ? 'primary' : 'orange'" :label="props.row.source" />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn v-if="props.row.source === 'EXTERNAL'" flat round dense icon="delete" color="negative"
              @click="confirmDelete(props.row)">
              <q-tooltip>Hapus peserta</q-tooltip>
            </q-btn>
            <span v-else class="text-caption text-grey">
              <q-icon name="lock" size="16px" /> Dari SIAKAD
            </span>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Import -->
    <q-dialog v-model="showImportDialog" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card>
        <q-bar class="bg-primary text-white">
          <q-space />
          <q-btn dense flat icon="minimize" @click="showImportDialog = false">
            <q-tooltip>Tutup</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section>
          <div class="text-h5 q-mb-md">Import Peserta Eksternal</div>

          <q-stepper v-model="step" ref="stepper" color="primary" animated>
            <!-- Step 1: Upload CSV -->
            <q-step :name="1" title="Upload CSV" icon="upload_file">
              <!-- <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded>
                <template v-slot:avatar>
                  <q-icon name="info" color="primary" />
                </template>
                <b>Format CSV:</b> participant_id, name, class<br>
                Contoh:<br>
                <code>EXT-001,Ahmad Fauzi,X IPA 2</code><br>
                <code>EXT-002,Siti Nurhaliza,X IPA 2</code>
              </q-banner> -->

              <q-form @submit.prevent="nextStep" class="q-gutter-md">
                <!-- <q-select v-model="importForm.exam_id" :options="examOptions" label="Ujian Tujuan" outlined emit-value
                  map-options :rules="[val => !!val || 'Ujian wajib dipilih']" />

                <q-select v-model="importForm.semester_id" :options="semesterOptions" label="Semester" outlined
                  emit-value map-options :rules="[val => !!val || 'Semester wajib dipilih']" />

                <q-input v-model="importForm.school_name" label="Nama Sekolah Asal" outlined
                  :rules="[val => !!val || 'Nama sekolah wajib diisi']" /> -->

                <q-file v-model="importForm.csv_file" label="File CSV" accept=".csv" outlined
                  :rules="[val => !!val || 'File CSV wajib dipilih']">
                  <template v-slot:prepend><q-icon name="attach_file" /></template>
                </q-file>

                <div class="row q-gutter-sm">
                  <q-btn type="submit" color="primary" label="Lanjut" />
                  <q-btn flat color="grey" label="Batal" v-close-popup />
                </div>
              </q-form>
            </q-step>

            <!-- Step 2: Preview -->
            <q-step :name="2" title="Preview & Validasi" icon="visibility">
              <div v-if="adminStore.importErrors.length > 0" class="q-mb-md">
                <q-banner class="bg-negative text-white" rounded>
                  <template v-slot:avatar>
                    <q-icon name="error" />
                  </template>
                  <b>{{ adminStore.importErrors.length }} error ditemukan:</b>
                  <ul class="q-mb-none">
                    <li v-for="(err, idx) in adminStore.importErrors.slice(0, 5)" :key="idx">
                      Baris {{ err.row }}: {{ err.message }}
                    </li>
                  </ul>
                </q-banner>
              </div>

              <q-table :rows="adminStore.importPreview" :columns="previewColumns" row-key="_rowNumber" flat bordered
                dense :rows-per-page-options="[10, 25, 50]">
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
                  :loading="adminStore.isImporting" @click="confirmImport" />
                <q-btn flat color="grey" label="Batal" v-close-popup />
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from '@/stores/admin/dashboard'
import { useQuestionsStore } from '@/stores/exam/questions'

const $q = useQuasar()
const adminStore = useAdminStore()
const questionsStore = useQuestionsStore()

const loading = ref(false)
const showImportDialog = ref(false)
const step = ref(1)

const filter = reactive({
  exam_id: null,
  source: null,
  search: ''
})

const importForm = reactive({
  exam_id: '',
  semester_id: '',
  school_name: '',
  csv_file: null
})

const sourceOptions = [
  { label: 'SIAKAD (Dapodik)', value: 'SIAKAD' },
  { label: 'Eksternal', value: 'EXTERNAL' }
]

// eslint-disable-next-line no-unused-vars
const semesterOptions = [
  { label: '2025/2026 - Ganjil', value: '20251' },
  { label: '2025/2026 - Genap', value: '20252' },
  { label: '2026/2027 - Ganjil', value: '20261' }
]

const columns = [
  { name: 'participant_id', label: 'NISN', field: 'participant_id', align: 'left' },
  { name: 'name', label: 'Nama', field: 'name', align: 'left' },
  { name: 'class', label: 'Kelas', field: 'class', align: 'center' },
  // { name: 'exam_name', label: 'Ujian', field: 'exam_name', align: 'left' },
  // { name: 'school_name', label: 'Sekolah', field: 'school_name', align: 'left' },
  { name: 'source', label: 'Status', field: 'source', align: 'center' },
  // { name: 'source', label: 'Sumber', field: 'source', align: 'center' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'center' }
]

const previewColumns = [
  { name: '_rowNumber', label: 'Baris', field: '_rowNumber', align: 'center' },
  { name: 'participant_id', label: 'ID Peserta', field: 'participant_id', align: 'left' },
  { name: 'name', label: 'Nama', field: 'name', align: 'left' },
  { name: 'class', label: 'Kelas', field: 'class', align: 'left' },
  { name: '_error', label: 'Status', field: '_error', align: 'center' }
]

const examOptions = computed(() =>
  questionsStore.exams.map(e => ({ label: e.name, value: e.id }))
)

const filteredParticipants = computed(() => {
  return adminStore.participants.filter(p => {
    if (filter.exam_id && p.exam_id !== filter.exam_id) return false
    if (filter.source && p.source !== filter.source) return false
    if (filter.search) {
      const search = filter.search.toLowerCase()
      if (!p.name.toLowerCase().includes(search) &&
        !p.participant_id.toLowerCase().includes(search)) {
        return false
      }
    }
    return true
  })
})

const validCount = computed(() =>
  adminStore.importPreview.filter(p => !p._error).length
)

const nextStep = async () => {
  if (!importForm.csv_file) return

  try {
    await adminStore.parseParticipantsFile(
      importForm.csv_file,
      importForm.exam_id,
      importForm.semester_id,
      importForm.school_name
    )
    step.value = 2
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Gagal memproses file'
    })
  }
}

const confirmImport = () => {
  $q.dialog({
    title: 'Konfirmasi Import',
    message: `Import <b>${validCount.value}</b> peserta ke ujian ini?<br><br>Tindakan ini tidak dapat dibatalkan.`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Ya, Import', color: 'positive', flat: true },
    persistent: true
  }).onOk(async () => {
    try {
      const result = await adminStore.confirmImportParticipants(
        importForm.exam_id,
        importForm.semester_id,
        importForm.school_name
      )

      $q.notify({
        type: 'positive',
        message: `${result.imported_count} peserta berhasil diimport!`,
        timeout: 3000
      })

      // Reset form
      showImportDialog.value = false
      step.value = 1
      importForm.exam_id = ''
      importForm.semester_id = ''
      importForm.school_name = ''
      importForm.csv_file = null

      // Refresh data
      await adminStore.fetchParticipants()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Gagal mengimport peserta'
      })
    }
  })
}

const confirmDelete = (participant) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus peserta <b>${participant.name}</b> (${participant.participant_id})?<br><br>Peserta ini tidak akan bisa mengikuti ujian.`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Ya, Hapus', color: 'negative', flat: true },
    persistent: true
  }).onOk(async () => {
    try {
      await adminStore.deleteParticipant(participant.id)
      $q.notify({ type: 'positive', message: 'Peserta berhasil dihapus' })
    } catch {
      $q.notify({ type: 'negative', message: 'Gagal menghapus peserta' })
    }
  })
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      adminStore.fetchParticipants(),
      questionsStore.fetchExams()
    ])
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal memuat data' })
  } finally {
    loading.value = false
  }
})
</script>
