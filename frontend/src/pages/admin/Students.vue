<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="groups" color="primary" size="sm" class="q-mr-sm" />
          Siswa
        </div>
        <div class="text-caption text-grey-7">
          Master data siswa — akan dijadikan peserta ujian.
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="upload_file" label="Import CSV" no-caps @click="openImportDialog" />
        <q-btn color="primary" icon="add" label="Tambah Siswa" no-caps @click="openCreateDialog" />
      </div>
    </div>

    <q-banner
      v-if="errorState === 'endpoint_not_ready'"
      dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md"
    >
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="searchQuery" label="Cari NISN / NIS / Nama" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterKelas" :options="classOptions" label="Kelas" outlined dense emit-value map-options clearable />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filterGender" :options="genderOptions" label="JK" outlined dense emit-value map-options clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterStatus" :options="statusOptions" label="Status" outlined dense emit-value map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="bg-white">
      <q-table
        :rows="filteredStudents"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        no-data-label="Belum ada siswa"
      >
        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama }}</div>
            <div class="text-caption text-grey-6">
              NISN: {{ props.row.nisn }}<span v-if="props.row.nis"> · NIS: {{ props.row.nis }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-jenis_kelamin="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.jenis_kelamin === 'L' ? 'blue' : 'pink'" :label="props.row.jenis_kelamin || '-'" />
          </q-td>
        </template>

        <template v-slot:body-cell-kelas_nama="props">
          <q-td :props="props">
            <q-chip dense outline color="primary" icon="class">
              {{ props.row.kelas_nama || '-' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.status === 'AKTIF' ? 'positive' : 'grey-6'" :label="props.row.status" />
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

    <StudentFormDialog
      v-model="dialogOpen"
      :is-editing="isEditing"
      :initial-form="initialForm"
      :submitting="submitting"
      :status-options="statusOptions"
      :gender-options="genderOptions"
      :class-options="classOptions"
      @submit="submitForm"
    />

    <StudentImportDialog
      v-model="importDialogOpen"
      :import-step="importStep"
      :import-preview="importPreview"
      :importing="importing"
      :downloading-template="downloadingTemplate"
      :import-valid-count="importValidCount"
      @update:import-step="importStep = $event"
      @download-template="downloadTemplate"
      @parse-import="parseImport"
      @confirm-import="confirmImport"
      @close="closeImportDialog"
    />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStudents } from '@/composables/admin/useStudents'
import StudentFormDialog from '@/components/admin/StudentFormDialog.vue'
import StudentImportDialog from '@/components/admin/StudentImportDialog.vue'

const $q = useQuasar()

const {
  loading,
  errorState,
  searchQuery,
  filterKelas,
  filterStatus,
  filterGender,
  filteredStudents,
  statusOptions,
  genderOptions,
  classOptions,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteStudent,
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
} = useStudents()

const columns = [
  { name: 'nama', label: 'Nama / NISN', field: 'nama', align: 'left', style: 'min-width: 240px' },
  { name: 'jenis_kelamin', label: 'JK', field: 'jenis_kelamin', align: 'center', style: 'width: 80px' },
  { name: 'kelas_nama', label: 'Kelas', field: 'kelas_nama', align: 'left', style: 'min-width: 160px' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 100px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus siswa <b>${row.nama}</b> (${row.nisn})?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteStudent(row)
  })
}
</script>
