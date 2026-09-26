<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="class" color="primary" size="sm" class="q-mr-sm" />
          Kelas / Rombel
        </div>
        <div class="text-caption text-grey-7">
          Master data kelas dan wali kelas.
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="upload_file" label="Import CSV" no-caps @click="openImportDialog" />
        <q-btn color="primary" icon="add" label="Tambah Kelas" no-caps @click="openCreateDialog" />
      </div>
    </div>

    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>
    <q-banner v-else-if="errorState === 'network_error'" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
      <template v-slot:avatar><q-icon name="wifi_off" color="orange" /></template>
      Koneksi terputus.
    </q-banner>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input v-model="searchQuery" label="Cari nama / wali kelas" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterTingkat" :options="tingkatOptions" label="Filter Tingkat" outlined dense emit-value
            map-options clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterJenisRombel" :options="jenisRombelOptions" label="Filter Jenis" outlined dense
            emit-value map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredClasses" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada kelas">
        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama }}</div>
            <div class="text-caption text-grey-6">
              Tingkat {{ props.row.tingkat || '-' }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-tingkat="props">
          <q-td :props="props" class="text-center">
            <q-badge color="primary" :label="`Tingkat ${props.row.tingkat}`" />
          </q-td>
        </template>

        <template v-slot:body-cell-kurikulum="props">
          <q-td :props="props" class="text-center">
            <q-chip dense outline color="teal">{{ props.row.kurikulum || '-' }}</q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-jenis_rombel="props">
          <q-td :props="props" class="text-center">
            <q-chip dense :color="jenisColor(props.row.jenis_rombel)" text-color="white"
              :label="props.row.jenis_rombel" />
          </q-td>
        </template>

        <template v-slot:body-cell-wali_kelas_nama="props">
          <q-td :props="props">
            <span v-if="props.row.wali_kelas_nama">
              <q-icon name="person" size="xs" color="primary" class="q-mr-xs" />
              {{ props.row.wali_kelas_nama }}
            </span>
            <span v-else class="text-caption text-grey-6 italic">Belum ditentukan</span>
          </q-td>
        </template>

        <template v-slot:body-cell-jumlah_siswa="props">
          <q-td :props="props" class="text-center">
            <q-chip dense outline color="orange" icon="people">
              {{ props.row.jumlah_siswa || 0 }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center" style="white-space: nowrap">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
              <q-tooltip>Hapus</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialogs -->
    <ClassFormDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm" :submitting="submitting"
      :tingkat-options="tingkatOptions" :kurikulum-options="kurikulumOptions" :jenis-rombel-options="jenisRombelOptions"
      :teacher-options="teacherOptions" :show-program-keahlian="showProgramKeahlian" @submit="submitForm" />

    <ClassImportDialog v-model="importDialogOpen" :import-step="importStep" :import-preview="importPreview"
      :import-errors="importErrors" :importing="importing" :downloading-template="downloadingTemplate"
      :import-valid-count="importValidCount" @update:import-step="importStep = $event"
      @download-template="downloadTemplate" @parse-import="parseImport" @confirm-import="confirmImport"
      @close="closeImportDialog" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useClasses } from '@/composables/admin/useClasses'
import ClassFormDialog from '@/components/admin/ClassFormDialog.vue'
import ClassImportDialog from '@/components/admin/ClassImportDialog.vue'

const $q = useQuasar()

const {
  loading,
  errorState,
  searchQuery,
  filterTingkat,
  filterJenisRombel,
  filteredClasses,
  tingkatOptions,
  kurikulumOptions,
  jenisRombelOptions,
  teacherOptions,
  showProgramKeahlian,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteClass,
  importDialogOpen,
  importStep,
  importPreview,
  importErrors,
  importing,
  downloadingTemplate,
  importValidCount,
  openImportDialog,
  closeImportDialog,
  downloadTemplate,
  parseImport,
  confirmImport,
} = useClasses()

const columns = [
  { name: 'nama', label: 'Nama Kelas', field: 'nama', align: 'left', style: 'min-width: 160px' },
  { name: 'tingkat', label: 'Tingkat', field: 'tingkat', align: 'center', style: 'width: 100px' },
  { name: 'kurikulum', label: 'Kurikulum', field: 'kurikulum', align: 'center', style: 'width: 110px' },
  { name: 'jenis_rombel', label: 'Jenis', field: 'jenis_rombel', align: 'center', style: 'width: 120px' },
  { name: 'wali_kelas_nama', label: 'Wali Kelas', field: 'wali_kelas_nama', align: 'left', style: 'min-width: 180px' },
  { name: 'jumlah_siswa', label: 'Siswa', field: 'jumlah_siswa', align: 'center', style: 'width: 100px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const jenisColor = (j) => {
  if (j === 'REGULER') return 'primary'
  if (j === 'PILIHAN') return 'teal'
  if (j === 'EKSKUL') return 'orange'
  return 'grey'
}

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus kelas <b>${row.nama}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteClass(row)
  })
}
</script>
