<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="supervisor_account" color="primary" size="sm" class="q-mr-sm" />
          Guru & Proctor
        </div>
        <div class="text-caption text-grey-7">
          Master data guru — guru mata pelajaran dan/atau wali kelas.
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="upload_file" label="Import CSV" no-caps @click="openImportDialog" />
        <q-btn color="primary" icon="add" label="Tambah Guru" no-caps @click="openCreateDialog" />
      </div>
    </div>

    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input v-model="searchQuery" label="Cari NIP / Nama / Username" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterStatus" :options="statusOptions" label="Status" outlined dense emit-value map-options
            clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterHomeroom" :options="[
            { label: 'Wali Kelas', value: 'YES' },
            { label: 'Bukan Wali', value: 'NO' },
          ]" label="Wali Kelas" outlined dense emit-value map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredTeachers" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada guru">
        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama }}</div>
            <div class="text-caption text-grey-6">
              {{ props.row.nip || 'Tanpa NIP' }} · @{{ props.row.username }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.status === 'AKTIF' ? 'positive' : 'grey-6'" :label="props.row.status" />
          </q-td>
        </template>

        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-chip v-if="props.row.is_homeroom" dense color="deep-purple" text-color="white" icon="supervisor_account">
              Wali: {{ props.row.homeroom_class_nama || '-' }}
            </q-chip>
            <q-chip v-if="(props.row.teaching_subject_ids || []).length > 0" dense outline color="primary"
              icon="menu_book" :label="`${props.row.teaching_subject_ids.length} mapel`" />
            <span v-if="!props.row.is_homeroom && !(props.row.teaching_subject_ids || []).length"
              class="text-caption text-grey-6 italic">
              Belum ada peran
            </span>
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

    <TeacherFormDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm" :submitting="submitting"
      :status-options="statusOptions" :subject-options="subjectOptions" :class-options="classOptions"
      @submit="submitForm" />

    <TeacherImportDialog v-model="importDialogOpen" :import-step="importStep" :import-preview="importPreview"
      :importing="importing" :downloading-template="downloadingTemplate" :import-valid-count="importValidCount"
      @update:import-step="importStep = $event" @download-template="downloadTemplate" @parse-import="parseImport"
      @confirm-import="confirmImport" @close="closeImportDialog" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useTeachers } from '@/composables/admin/useTeachers'
import TeacherFormDialog from '@/components/admin/TeacherFormDialog.vue'
import TeacherImportDialog from '@/components/admin/TeacherImportDialog.vue'

const $q = useQuasar()

const {
  loading,
  errorState,
  searchQuery,
  filterStatus,
  filterHomeroom,
  filteredTeachers,
  statusOptions,
  subjectOptions,
  classOptions,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteTeacher,
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
} = useTeachers()

const columns = [
  { name: 'nama', label: 'Nama / NIP', field: 'nama', align: 'left', style: 'min-width: 240px' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 100px' },
  { name: 'role', label: 'Peran', align: 'left', style: 'min-width: 220px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus guru <b>${row.nama}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteTeacher(row)
  })
}
</script>
