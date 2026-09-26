<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="menu_book" color="primary" size="sm" class="q-mr-sm" />
          Mata Pelajaran
        </div>
        <div class="text-caption text-grey-7">
          Master data mata pelajaran — Wajib, Pilihan, Muatan Lokal, Kejuruan (SMK).
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="upload_file" label="Import CSV" no-caps @click="openImportDialog" />
        <q-btn color="primary" icon="add" label="Tambah Mapel" no-caps @click="openCreateDialog" />
      </div>
    </div>

    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-5">
          <q-input v-model="searchQuery" label="Cari kode / nama" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterTingkat" :options="tingkatOptions" label="Tingkat" outlined dense emit-value
            map-options clearable />
        </div>
        <div class="col-12 col-md-4">
          <q-select v-model="filterKelompok" :options="kelompokOptions" label="Kelompok" outlined dense emit-value
            map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredSubjects" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada mata pelajaran">
        <template v-slot:body-cell-kode="props">
          <q-td :props="props">
            <q-badge color="primary" :label="props.row.kode" />
            <div class="text-caption text-grey-6 q-mt-xs">{{ props.row.nama_singkat }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-kelompok="props">
          <q-td :props="props" class="text-center">
            <q-chip dense :color="kelompokColor(props.row.kelompok)" text-color="white" :label="props.row.kelompok" />
          </q-td>
        </template>

        <template v-slot:body-cell-tingkat="props">
          <q-td :props="props" class="text-center">
            <q-badge outline color="primary" :label="`Kelas ${props.row.tingkat}`" />
          </q-td>
        </template>

        <template v-slot:body-cell-jurusan="props">
          <q-td :props="props" class="text-center">
            <span v-if="props.row.jurusan_id" class="text-caption text-grey-7">
              {{ jurusanNama(props.row.jurusan_id) }}
            </span>
            <span v-else class="text-caption text-grey-5">—</span>
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

    <SubjectFormDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm" :submitting="submitting"
      :kelompok-options="kelompokOptions" :tingkat-options="tingkatOptions" :jurusan-options="jurusanOptions"
      :loading-context="loadingContext" @submit="submitForm" />

    <SubjectImportDialog v-model="importDialogOpen" :import-step="importStep" :import-preview="importPreview"
      :import-errors="importErrors" :importing="importing" :downloading-template="downloadingTemplate"
      :import-valid-count="importValidCount" @update:import-step="importStep = $event"
      @download-template="downloadTemplate" @parse-import="onParseImport" @confirm-import="confirmImport"
      @close="closeImportDialog" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useSubjects } from '@/composables/admin/useSubjects'
import SubjectFormDialog from '@/components/admin/SubjectFormDialog.vue'
import SubjectImportDialog from '@/components/admin/SubjectImportDialog.vue'

const $q = useQuasar()

const {
  programs,
  loading,
  errorState,
  searchQuery,
  filterKelompok,
  filterTingkat,
  filteredSubjects,
  kelompokOptions,
  tingkatOptions,
  jurusanOptions,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteSubject,
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
  confirmImport, loadingContext
} = useSubjects()

// ── Auto-advance step 2 setelah parse sukses (fix T7)
const onParseImport = async (file) => {
  const result = await parseImport(file)
  if (result?.success) {
    importStep.value = 2
  }
}

const columns = [
  { name: 'kode', label: 'Kode / Singkat', field: 'kode', align: 'left', style: 'width: 160px' },
  { name: 'nama', label: 'Nama Mapel', field: 'nama', align: 'left', style: 'min-width: 220px' },
  { name: 'kelompok', label: 'Kelompok', field: 'kelompok', align: 'center', style: 'width: 130px' },
  { name: 'tingkat', label: 'Tingkat', field: 'tingkat', align: 'center', style: 'width: 100px' },
  { name: 'jurusan', label: 'Jurusan', align: 'center', style: 'width: 130px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const kelompokColor = (k) => {
  if (k === 'WAJIB') return 'primary'
  if (k === 'PILIHAN') return 'teal'
  if (k === 'MULOK') return 'orange'
  if (k === 'KEJURUAN') return 'deep-purple'
  return 'grey'
}

const jurusanNama = (id) => {
  const p = (programs.value || []).find((x) => x.id === id)
  return p?.nama || p?.kode || id
}

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus mata pelajaran <b>${row.nama}</b> (${row.kode})?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteSubject(row)
  })
}
</script>
