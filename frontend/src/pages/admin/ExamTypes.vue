<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="assignment" color="primary" size="sm" class="q-mr-sm" />
          Jenis Ujian
        </div>
        <div class="text-caption text-grey-7">
          Master jenis ujian — dipakai untuk auto-generate judul ujian.
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="upload_file" label="Import CSV" no-caps @click="openImportDialog" />
        <q-btn color="primary" icon="add" label="Tambah Jenis" no-caps @click="openCreateDialog" />
      </div>
    </div>

    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section>
        <q-input v-model="searchQuery" label="Cari kode / nama" outlined dense clearable>
          <template v-slot:prepend><q-icon name="search" /></template>
        </q-input>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredExamTypes" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada jenis ujian">
        <template v-slot:body-cell-kode="props">
          <q-td :props="props">
            <q-badge color="primary" :label="props.row.kode" class="text-weight-bold" />
          </q-td>
        </template>

        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama }}</div>
            <div v-if="props.row.deskripsi" class="text-caption text-grey-6">
              {{ props.row.deskripsi }}
            </div>
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

    <ExamTypeFormDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm"
      :submitting="submitting" @submit="submitForm" />

    <ExamTypeImportDialog v-model="importDialogOpen" :import-step="importStep" :import-preview="importPreview"
      :importing="importing" :downloading-template="downloadingTemplate" :import-valid-count="importValidCount"
      @update:import-step="importStep = $event" @download-template="downloadTemplate" @parse-import="parseImport"
      @confirm-import="confirmImport" @close="closeImportDialog" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useExamTypes } from '@/composables/admin/useExamTypes'
import ExamTypeFormDialog from '@/components/admin/ExamTypeFormDialog.vue'
import ExamTypeImportDialog from '@/components/admin/ExamTypeImportDialog.vue'

const $q = useQuasar()

const {
  loading,
  errorState,
  searchQuery,
  filteredExamTypes,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteExamType,
  importDialogOpen,
  importStep,
  importPreview,
  importing,
  downloadingTemplate,
  importValidCount,
  openImportDialog,
  closeImportDialog,
  downloadTemplate,
  parseImport,
  confirmImport,
} = useExamTypes()

const columns = [
  { name: 'kode', label: 'Kode', field: 'kode', align: 'left', style: 'width: 130px' },
  { name: 'nama', label: 'Nama Jenis Ujian', field: 'nama', align: 'left', style: 'min-width: 240px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus jenis ujian <b>${row.nama}</b> (${row.kode})?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteExamType(row)
  })
}
</script>
