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
          Pilih jenis ujian → kelas → mata pelajaran untuk mengelola soal.
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
      <!-- Picker Bar: Tingkat + Kelas -->
      <q-card flat bordered class="q-mb-md bg-white">
        <q-card-section class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-select v-model="tingkat" :options="tingkatOptions" label="Pilih Tingkat" outlined dense emit-value
              map-options @update:model-value="onTingkatChange">
              <template v-slot:prepend><q-icon name="stairs" /></template>
            </q-select>
          </div>
          <div class="col-12 col-md-6">
            <q-select v-model="classId" :options="classOptions" label="Pilih Kelas" outlined dense emit-value
              map-options :disable="!tingkat" :hint="!tingkat ? 'Pilih tingkat terlebih dahulu' : ''"
              @update:model-value="onClassChange">
              <template v-slot:prepend><q-icon name="class" /></template>
            </q-select>
          </div>
          <div v-if="selectedClass" class="col-12 col-md-2 text-right">
            <q-chip color="blue-grey-2" text-color="blue-grey-9" icon="groups">
              {{ filteredClassCount }} kelas
            </q-chip>
          </div>
        </q-card-section>
      </q-card>

      <!-- STATE 2a: Belum pilih kelas -->
      <q-card v-if="!classId" flat bordered class="bg-white">
        <q-card-section class="text-center q-pa-xl text-grey-6">
          <q-icon name="class" size="60px" color="grey-4" />
          <div class="text-h6 q-mt-md">Pilih Kelas</div>
          <div class="text-caption q-mt-sm">
            Setelah memilih kelas, daftar mata pelajaran akan muncul.
          </div>
        </q-card-section>
      </q-card>

      <!-- STATE 2b: Kelas sudah dipilih -->
      <SubjectQuestionTable v-else :rows="subjectTable" :loading="loading" :stats="stats" @edit="onEdit"
        @preview="onPreview" @delete="onDelete" />
    </template>

    <!-- Exam Type Picker Dialog -->
    <ExamTypePickerDialog v-model="examTypePickerOpen" :exam-types="examTypes" :selected-id="examTypeId"
      @select="selectExamType" />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useQuestionsV2 } from '@/composables/admin/useQuestionsV2'
import ExamTypePickerDialog from '@/components/admin/ExamTypePickerDialog.vue'
import SubjectQuestionTable from '@/components/admin/SubjectQuestionTable.vue'
import { useRouter } from 'vue-router'
import { ExamService } from '@/services/admin/ExamService'
// ...
const router = useRouter()
const $q = useQuasar()

const {
  loading,
  errorState,
  examTypes,
  examTypeId,
  tingkat,
  classId,
  examTypePickerOpen,
  selectedExamType,
  tingkatOptions,
  classOptions,
  selectedClass,
  subjectTable,
  stats,
  selectExamType,
  changeExamType,
  onTingkatChange,
  onClassChange,
} = useQuestionsV2()

const filteredClassCount = computed(() => {
  if (!tingkat.value) return 0
  return classOptions.value.length
})

// ── Aksi (placeholder — Fase 2b)
const onEdit = async (row) => {
  // Find-or-create exam untuk mapel ini
  if (row.exam_id) {
    router.push({ name: 'admin-question-editor', params: { examId: row.exam_id } })
    return
  }
  // Belum ada exam → create dulu
  try {
    const res = await ExamService.findOrCreate({
      jenis_ujian_id: examTypeId.value,
      subject_id: row.id,
      class_id: classId.value,
      academic_year: '2025/2026',
      semester: 'GANJIL',
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
  $q.notify({
    type: 'info',
    icon: 'construction',
    message: `Preview soal "${row.nama}" akan tersedia di Fase 2b.`,
  })
}

const onDelete = (row) => {
  $q.dialog({
    title: 'Hapus Soal',
    message: `Hapus semua soal untuk <b>${row.nama}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(() => {
    $q.notify({
      type: 'info',
      message: 'Fitur hapus soal akan tersedia di Fase 2b.',
    })
  })
}
</script>
