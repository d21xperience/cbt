<!-- src/components/admin/QuestionUpload.vue -->
<template>
  <div class="question-upload">
    <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="info" color="primary" />
      </template>
      Upload file CSV atau Excel berisi soal ujian. File akan di-parse dan divalidasi sebelum
      di-submit.
      <br /><br />
      <b>Format yang didukung:</b> .csv, .xlsx, .xls<br />
      <b>Maksimal ukuran:</b> 5 MB
    </q-banner>

    <!-- File Input (lebih simple daripada q-uploader untuk mock) -->
    <q-file
      v-model="selectedFile"
      :label="!examId ? 'Pilih ujian terlebih dahulu' : 'Pilih file CSV/Excel'"
      accept=".csv,.xlsx,.xls"
      :max-file-size="5242880"
      :disable="!examId || questionsStore.isUploading"
      outlined
      clearable
      @update:model-value="onFileSelected"
      class="full-width"
    >
      <template v-slot:prepend>
        <q-icon name="attach_file" />
      </template>
      <template v-slot:append>
        <q-icon
          v-if="selectedFile"
          name="send"
          class="cursor-pointer"
          @click.stop="parseFile"
          :color="questionsStore.isUploading ? 'grey' : 'primary'"
        >
          <q-tooltip>Parse File</q-tooltip>
        </q-icon>
      </template>
    </q-file>

    <!-- Progress Bar -->
    <q-linear-progress
      v-if="questionsStore.isUploading"
      :value="questionsStore.uploadProgress / 100"
      color="primary"
      class="q-mt-md"
    >
      <div class="absolute-full flex flex-center">
        <q-badge color="white" text-color="primary" :label="`${questionsStore.uploadProgress}%`" />
      </div>
    </q-linear-progress>

    <!-- Info File -->
    <div v-if="selectedFile" class="q-mt-md">
      <q-chip
        icon="insert_drive_file"
        color="primary"
        text-color="white"
        removable
        @remove="clearFile"
      >
        {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
      </q-chip>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useQuestionsStore } from '@/stores/exam/questions'

const props = defineProps({
  examId: { type: String, required: true },
})

const emit = defineEmits(['parsed'])

const $q = useQuasar()
const questionsStore = useQuestionsStore()
const selectedFile = ref(null)

const onFileSelected = (file) => {
  if (file) {
    console.log('📁 File selected:', file.name, file.size, 'bytes')
  }
}

const clearFile = () => {
  selectedFile.value = null
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

const parseFile = async () => {
  if (!selectedFile.value) {
    $q.notify({
      type: 'warning',
      message: 'Pilih file terlebih dahulu',
    })
    return
  }

  try {
    const result = await questionsStore.parseFile(selectedFile.value, props.examId)

    $q.notify({
      type: result.invalid > 0 ? 'warning' : 'positive',
      message: `Berhasil parse ${result.total} soal (${result.valid} valid, ${result.invalid} error)`,
      timeout: 3000,
    })

    if (result.valid > 0) {
      emit('parsed')
    }

    clearFile()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || error.message || 'Gagal memproses file',
    })
  }
}
</script>
