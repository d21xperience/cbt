<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="menu_book" color="primary" size="sm" class="q-mr-sm" />
          Pembelajaran
        </div>
        <div class="text-caption text-grey-7">
          Jembatan Mapel × Kelas × Guru × Semester.
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn outline color="primary" icon="upload_file" label="Import CSV" no-caps @click="openImportDialog" />
        <q-btn color="primary" icon="add" label="Tambah Pembelajaran" no-caps @click="openCreateDialog" />
      </div>
    </div>

    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="searchQuery" label="Cari mapel / kelas / guru" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterClass" :options="classOptions" label="Kelas" outlined dense emit-value map-options
            clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterTeacher" :options="teacherOptions" label="Guru" outlined dense emit-value map-options
            clearable />
        </div>
        <div class="col-12 col-md-2">
          <q-select v-model="filterSemester" :options="semesterOptions" label="Smt" outlined dense emit-value
            map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredLessons" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada pembelajaran">
        <template v-slot:body-cell-subject_nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.subject_nama || '-' }}</div>
            <div class="text-caption text-grey-6">{{ props.row.subject_kode || '' }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-class_nama="props">
          <q-td :props="props">
            <q-chip dense outline color="primary" icon="class">
              {{ props.row.class_nama || '-' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-teacher_nama="props">
          <q-td :props="props">
            <q-icon name="person" size="xs" color="primary" class="q-mr-xs" />
            {{ props.row.teacher_nama || '-' }}
          </q-td>
        </template>

        <template v-slot:body-cell-semester="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.semester === 'GANJIL' ? 'blue' : 'teal'" :label="props.row.semester" />
            <div class="text-caption text-grey-6 q-mt-xs">{{ props.row.academic_year }}</div>
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

    <LessonFormDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm" :submitting="submitting"
      :subject-options="subjectOptions" :class-options="classOptions" :teacher-options="teacherOptions"
      :semester-options="semesterOptions" @submit="submitForm" />

    <LessonImportDialog v-model="importDialogOpen" :import-step="importStep" :import-preview="importPreview"
      :importing="importing" :downloading-template="downloadingTemplate" :import-valid-count="importValidCount"
      @update:import-step="importStep = $event" @download-template="downloadTemplate" @parse-import="onParseImport"
      @confirm-import="confirmImport" @close="closeImportDialog" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useLessons } from '@/composables/admin/useLessons'
import LessonFormDialog from '@/components/admin/LessonFormDialog.vue'
import LessonImportDialog from '@/components/admin/LessonImportDialog.vue'

const $q = useQuasar()

const {
  loading,
  errorState,
  searchQuery,
  filterClass,
  filterTeacher,
  filterSemester,
  filteredLessons,
  semesterOptions,
  subjectOptions,
  classOptions,
  teacherOptions,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteLesson,
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
} = useLessons()

const columns = [
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left', style: 'min-width: 200px' },
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'min-width: 160px' },
  { name: 'teacher_nama', label: 'Guru Pengampu', field: 'teacher_nama', align: 'left', style: 'min-width: 200px' },
  { name: 'semester', label: 'Semester', align: 'center', style: 'width: 140px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus pembelajaran <b>${row.subject_nama}</b> di kelas <b>${row.class_nama}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteLesson(row)
  })
}
// ── Parse import + auto-advance step 2
const onParseImport = async (file) => {
  const result = await parseImport(file)
  if (result?.success) {
    importStep.value = 2
  }
}
</script>
