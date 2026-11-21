<template>
  <q-page padding>
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="quiz" color="primary" size="sm" class="q-mr-sm" />
          Kelola Soal
        </div>
        <div class="text-caption text-grey-7">
          Pilih jenis ujian → mata pelajaran → kelas untuk mengelola soal.
        </div>
      </div>
      <div class="row q-gutter-sm">
        <template v-if="selectedExamType">
          <q-chip color="primary" text-color="white" icon="assignment" class="text-weight-bold">
            {{ selectedExamType.kode }} — {{ selectedExamType.nama }}
          </q-chip>
          <q-btn outline color="primary" icon="swap_horiz" label="Ganti Jenis" no-caps @click="changeExamType" />
        </template>
        <q-btn v-else color="primary" icon="assignment" label="Pilih Jenis Ujian" no-caps
          @click="examTypePickerOpen = true" />
      </div>
    </div>

    <!-- Error banner -->
    <q-banner v-if="errorState === 'server_error'" dense rounded class="bg-red-1 text-red-9 q-mb-md">
      <template v-slot:avatar><q-icon name="error" color="red" /></template>
      Server error. Refresh halaman untuk coba lagi.
    </q-banner>

    <!-- STATE 1: Belum pilih jenis ujian -->
    <q-card v-if="!selectedExamType" flat bordered class="bg-white">
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="assignment" size="80px" color="grey-4" />
        <div class="text-h6 q-mt-md">Belum Ada Jenis Ujian Dipilih</div>
        <div class="text-caption q-mt-sm">
          Pilih jenis ujian terlebih dahulu untuk mulai mengelola soal.
        </div>
        <q-btn color="primary" icon="assignment" label="Pilih Jenis Ujian" no-caps class="q-mt-md"
          @click="examTypePickerOpen = true" />
      </q-card-section>
    </q-card>

    <!-- STATE 2: Sudah pilih jenis ujian -->
    <template v-else>
      <!-- Picker Bar: Mata Pelajaran -->
      <!-- Picker Bar: Tingkat & Kelas -->
      <q-card flat bordered class="q-mb-md bg-white">
        <q-card-section class="row q-col-gutter-md items-end">
          <!-- Filter Tingkat -->
          <div class="col-12 col-md-4">
            <div class="text-caption text-grey-7 q-mb-xs">1. Pilih Tingkat</div>
            <div class="row q-gutter-sm">
              <q-btn :color="selectedTingkat === 'all' ? 'primary' : 'grey-3'"
                :text-color="selectedTingkat === 'all' ? 'white' : 'grey-8'" label="Semua" no-caps dense rounded
                @click="selectTingkat('all')" />
              <q-btn v-for="t in ['10', '11', '12']" :key="t" :color="selectedTingkat === t ? 'primary' : 'grey-3'"
                :text-color="selectedTingkat === t ? 'white' : 'grey-8'" :label="`Kelas ${t}`" no-caps dense rounded
                @click="selectTingkat(t)" />
            </div>
          </div>

          <!-- Filter Kelas -->
          <div class="col-12 col-md-8">
            <div class="text-caption text-grey-7 q-mb-xs">2. Pilih Kelas (Opsional)</div>
            <q-select v-model="selectedClassId" :options="classOptions" label="Semua Kelas di Tingkat Ini" outlined
              dense emit-value map-options clearable @update:model-value="onClassChange">
              <template v-slot:prepend><q-icon name="class" /></template>
            </q-select>
          </div>
        </q-card-section>
      </q-card>

      <!-- STATE 2a: Belum pilih tingkat/kelas -->
      <q-card v-if="selectedTingkat === 'all' && !selectedClassId" flat bordered class="bg-white">
        <q-card-section class="text-center q-pa-xl text-grey-6">
          <q-icon name="filter_list" size="60px" color="grey-4" />
          <div class="text-h6 q-mt-md">Pilih Tingkat atau Kelas</div>
          <div class="text-caption q-mt-sm">
            Pilih tingkat (10, 11, 12) atau kelas spesifik untuk melihat daftar mata pelajaran.
          </div>
        </q-card-section>
      </q-card>

      <!-- STATE 2a: Belum pilih mapel -->
      <!-- <q-card v-if="!selectedSubjectId" flat bordered class="bg-white">
        <q-card-section class="text-center q-pa-xl text-grey-6">
          <q-icon name="menu_book" size="60px" color="grey-4" />
          <div class="text-h6 q-mt-md">Pilih Mata Pelajaran</div>
          <div class="text-caption q-mt-sm">
            Setelah memilih mata pelajaran, daftar kelas yang mengikuti akan muncul.
          </div>
        </q-card-section>
      </q-card> -->

      <!-- STATE 2b: Mapel sudah dipilih -->
      <SubjectQuestionTable v-else :rows="subjectTable" :loading="loading" :stats="stats" @edit="onEdit"
        @preview="onPreview" @delete="onDelete" />
    </template>

    <!-- Exam Type Picker Dialog -->
    <ExamTypePickerDialog v-model="examTypePickerOpen" :exam-types="examTypes" :selected-id="examTypeId"
      @select="selectExamType" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useQuestionsV2 } from '@/composables/admin/useQuestionsV2'
import ExamTypePickerDialog from '@/components/admin/ExamTypePickerDialog.vue'
import SubjectQuestionTable from '@/components/admin/SubjectQuestionTable.vue'
import { useRouter } from 'vue-router'
import { useAcademicStore } from '@/stores/academic'
import { ExamService } from '@/services/admin/ExamService'

const router = useRouter()
const $q = useQuasar()

const {
  loading,
  errorState,
  examTypes,
  examTypeId,
  classOptions,
  // selectedClass,
  selectedTingkat,
  selectedClassId,
  examTypePickerOpen,
  selectedExamType,
  subjectTable,
  stats,
  selectExamType,
  changeExamType,
  selectTingkat,
  onClassChange,
} = useQuestionsV2()

const academicStore = useAcademicStore()

// ── Aksi
const onEdit = async (row) => {
  if (row.exam_id) {
    router.push({ name: 'admin-question-editor', params: { examId: row.exam_id } })
    return
  }

  try {
    const res = await ExamService.findOrCreate({
      jenis_ujian_id: examTypeId.value,
      subject_id: row.subject_id,
      class_id: row.class_id, // Diambil dari baris tabel
      academic_period_id: academicStore.active_period_id,
    })
    const exam = res?.data?.data
    if (exam?.id) {
      router.push({ name: 'admin-question-editor', params: { examId: exam.id } })
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: `Gagal membuka editor. \n ${err}` })
  }
}

const onPreview = (row) => {
  $q.notify({ type: 'info', icon: 'construction', message: `Preview soal "${row.nama}" akan tersedia di Fase 2b.` })
}

const onDelete = (row) => {
  $q.dialog({
    title: 'Hapus Soal',
    message: `Hapus semua soal untuk <b>${row.nama}</b> di kelas <b>${row.class_nama}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(() => {
    $q.notify({ type: 'info', message: 'Fitur hapus soal akan tersedia di Fase 2b.' })
  })
}
</script>