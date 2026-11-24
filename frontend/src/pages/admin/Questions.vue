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
      <!-- <div class="row q-gutter-sm">
        <template v-if="selectedExamType">
          <q-chip color="primary" text-color="white" icon="assignment" class="text-weight-bold">
            {{ selectedExamType.kode }} — {{ selectedExamType.nama }}
          </q-chip>
          <q-btn
            outline
            color="primary"
            icon="swap_horiz"
            label="Ganti Jenis"
            no-caps
            @click="changeExamType"
          />
        </template>
<q-btn v-else color="primary" icon="assignment" label="Pilih Jenis Ujian" no-caps @click="examTypePickerOpen = true" />
</div> -->
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
            Pilih tingkat (10, 11, 12).
          </div>
        </q-card-section>
      </q-card>

      <!-- STATE 2b: Mapel sudah dipilih -->
      <SubjectQuestionTable v-else :rows="subjectTable" :loading="loading" :stats="stats" @edit="onEdit"
        @preview="onPreview" @delete="onDelete" @import="onImport" />
    </template>

    <!-- Exam Type Picker Dialog -->
    <ExamTypePickerDialog v-model="examTypePickerOpen" :exam-types="examTypes" :selected-id="examTypeId"
      @select="selectExamType" />

    <!-- Question Preview Dialog -->
    <QuestionPreviewDialog v-model="previewDialogOpen" :exam-id="previewExamId" :exam-title="previewExamTitle" />

    <!-- Question Import Dialog -->
    <QuestionImportDialog v-model="importDialogOpen" :exam-id="importExamId" :exam-title="importExamTitle"
      @success="onImportSuccess" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useQuestionsV2 } from '@/composables/admin/useQuestionsV2'
import ExamTypePickerDialog from '@/components/admin/ExamTypePickerDialog.vue'
import SubjectQuestionTable from '@/components/admin/SubjectQuestionTable.vue'
import QuestionPreviewDialog from '@/components/admin/QuestionPreviewDialog.vue'
import QuestionImportDialog from '@/components/admin/QuestionImportDialog.vue'
import { useRouter } from 'vue-router'
import { useAcademicStore } from '@/stores/academic'
import { ExamService } from '@/services/admin/ExamService'
import { ClassService } from '@/services/admin/ClassService'
import { ref, onMounted } from 'vue'

const router = useRouter()
const $q = useQuasar()
const academicStore = useAcademicStore()

const classes = ref([])
const previewDialogOpen = ref(false)
const previewExamId = ref(null)
const previewExamTitle = ref('')

const importDialogOpen = ref(false)
const importExamId = ref(null)
const importExamTitle = ref('')

const {
  loading,
  errorState,
  examTypes,
  examTypeId,
  classOptions,
  selectedTingkat,
  selectedClassId,
  examTypePickerOpen,
  selectedExamType,
  subjectTable,
  stats,
  selectExamType,
  // changeExamType,
  selectTingkat,
  onClassChange,
} = useQuestionsV2()

onMounted(async () => {
  try {
    const res = await ClassService.list()
    classes.value = Array.isArray(res?.data?.data) ? res.data.data : []
  } catch (err) {
    console.warn('Gagal load kelas untuk fallback:', err)
  }
})

const onEdit = async (row) => {
  if (row.exam_id) {
    router.push({ name: 'admin-question-editor', params: { examId: row.exam_id } })
    return
  }

  try {
    const classIdsInTingkat = classes.value
      .filter((c) => String(c.tingkat) === String(row.tingkat))
      .map((c) => c.id)

    const classIdToUse = row.class_id || (classIdsInTingkat.length > 0 ? classIdsInTingkat[0] : null)

    if (!classIdToUse) {
      $q.notify({ type: 'negative', message: 'Tidak ada kelas yang terdaftar di tingkat ini.' })
      return
    }

    const res = await ExamService.findOrCreate({
      jenis_ujian_id: examTypeId.value,
      subject_id: row.subject_id,
      class_id: classIdToUse,
      academic_period_id: academicStore.active_period_id,
    })

    const exam = res?.data?.data
    if (exam?.id) {
      router.push({ name: 'admin-question-editor', params: { examId: exam.id } })
    }
  } catch (err) {
    const msg = err?.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Gagal membuka editor. \n ${msg}` })
  }
}

const onPreview = (row) => {
  if (!row.exam_id) {
    $q.notify({
      type: 'warning',
      icon: 'warning',
      message: `Belum ada soal untuk mata pelajaran "${row.nama}". Silakan buat soal terlebih dahulu.`,
    })
    return
  }
  previewExamId.value = row.exam_id
  previewExamTitle.value = `${row.nama} (Tingkat ${row.tingkat})`
  previewDialogOpen.value = true
}

const onImport = async (row) => {
  // Jika belum ada exam_id, kita perlu membuat exam terlebih dahulu via findOrCreate
  if (!row.exam_id) {
    try {
      const classIdsInTingkat = classes.value
        .filter((c) => String(c.tingkat) === String(row.tingkat))
        .map((c) => c.id)

      const classIdToUse = row.class_id || (classIdsInTingkat.length > 0 ? classIdsInTingkat[0] : null)

      if (!classIdToUse) {
        $q.notify({ type: 'negative', message: 'Tidak ada kelas yang terdaftar di tingkat ini.' })
        return
      }

      const res = await ExamService.findOrCreate({
        jenis_ujian_id: examTypeId.value,
        subject_id: row.subject_id,
        class_id: classIdToUse,
        academic_period_id: academicStore.active_period_id,
      })

      const exam = res?.data?.data
      if (exam?.id) {
        importExamId.value = exam.id
        importExamTitle.value = `${row.nama} (Tingkat ${row.tingkat})`
        importDialogOpen.value = true
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message
      $q.notify({ type: 'negative', message: `Gagal menyiapkan import. \n ${msg}` })
    }
    return
  }

  // Jika sudah ada exam_id, langsung buka
  importExamId.value = row.exam_id
  importExamTitle.value = `${row.nama} (Tingkat ${row.tingkat})`
  importDialogOpen.value = true
}

const onImportSuccess = () => {
  // Trigger reload data tabel
  window.location.reload()
}

const onDelete = (row) => {
  if (!row.exam_id) {
    $q.notify({
      type: 'warning',
      icon: 'warning',
      message: `Belum ada soal yang bisa dihapus untuk "${row.nama}".`,
    })
    return
  }

  $q.dialog({
    title: 'Hapus Semua Soal',
    message: `Hapus <b>semua soal</b> untuk mata pelajaran <b>${row.nama}</b> (Tingkat ${row.tingkat})?<br/><br/><span class="text-negative">Tindakan ini tidak dapat dibatalkan.</span>`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus Semua', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    try {
      await ExamService.deleteQuestionsByExam(row.exam_id)
      $q.notify({ type: 'positive', message: `Semua soal untuk "${row.nama}" berhasil dihapus.` })
      window.location.reload()
    } catch (err) {
      const msg = err?.response?.data?.error || err.message
      $q.notify({ type: 'negative', message: `Gagal menghapus: ${msg}` })
    }
  })
}
</script>
