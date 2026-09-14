<!-- src/pages/admin/Questions.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">
      <q-icon name="quiz" color="primary" size="md" class="q-mr-sm" />
      Kelola Soal Ujian
    </div>

    <!-- Pilih Ujian -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row items-center q-gutter-md">
          <q-select v-model="selectedExamId" :options="examOptions" label="Pilih Ujian" outlined emit-value map-options
            class="col" :rules="[val => !!val || 'Ujian wajib dipilih']">
            <template v-slot:prepend><q-icon name="school" /></template>
          </q-select>

          <q-btn color="grey-7" icon="download" label="Download Template" @click="showTemplateDialog = true"
            :disable="!selectedExamId" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabs: Upload / Paste -->
    <q-card>
      <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify"
        narrow-indicator>
        <q-tab name="upload" icon="upload_file" label="Upload File (CSV/Excel)" />
        <q-tab name="paste" icon="content_paste" label="Paste Manual" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- TAB UPLOAD -->
        <q-tab-panel name="upload">
          <QuestionUpload :exam-id="selectedExamId" @parsed="onQuestionsParsed" />
        </q-tab-panel>

        <!-- TAB PASTE -->
        <q-tab-panel name="paste">
          <QuestionPaste :exam-id="selectedExamId" @parsed="onQuestionsParsed" />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Preview & Submit (muncul jika ada soal) -->
    <QuestionPreview v-if="questionsStore.parsedQuestions.length > 0" :exam-id="selectedExamId"
      @submitted="onSubmitSuccess" @cleared="questionsStore.clearParsedQuestions()" />

    <!-- Dialog Download Template -->
    <q-dialog v-model="showTemplateDialog">
      <q-card style="min-width: 400px;">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Download Template Soal</div>
        </q-card-section>

        <q-card-section>
          <div class="text-body2 q-mb-md">
            Pilih format template yang ingin didownload:
          </div>

          <q-list bordered separator>
            <q-item clickable @click="downloadTemplate('csv')" v-ripple>
              <q-item-section avatar>
                <q-icon name="table_chart" color="green" size="32px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>CSV (Comma Separated Values)</q-item-label>
                <q-item-label caption>Bisa dibuka di Excel, Google Sheets, atau text editor</q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable @click="downloadTemplate('xlsx')" v-ripple>
              <q-item-section avatar>
                <q-icon name="description" color="blue" size="32px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Excel (.xlsx)</q-item-label>
                <q-item-label caption>Format Excel native, lebih mudah diisi</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Tutup" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useQuestionsStore } from '@/stores/exam/questions'
import QuestionUpload from '@/components/admin/QuestionUpload.vue'
import QuestionPaste from '@/components/admin/QuestionPaste.vue'
import QuestionPreview from '@/components/admin/QuestionPreview.vue'

const $q = useQuasar()
const questionsStore = useQuestionsStore()

const tab = ref('upload')
const selectedExamId = ref('')
const showTemplateDialog = ref(false)

const examOptions = computed(() =>
  questionsStore.exams.map(e => ({ label: e.name, value: e.id }))
)

const downloadTemplate = async (format) => {
  try {
    await questionsStore.downloadTemplate(format)
    $q.notify({
      type: 'positive',
      message: `Template ${format.toUpperCase()} berhasil didownload`
    })
    showTemplateDialog.value = false
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Gagal mendownload template'
    })
  }
}

const onQuestionsParsed = () => {
  // Scroll ke preview
  setTimeout(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, 100)
}

const onSubmitSuccess = (data) => {
  $q.notify({
    type: 'positive',
    message: `${data.imported_count} soal berhasil diimport!`,
    timeout: 3000
  })
}

onMounted(async () => {
  await questionsStore.fetchExams()
})
</script>
