<!-- src/components/admin/QuestionPreview.vue -->
<template>
  <q-card class="q-mt-md">
    <q-card-section class="bg-primary text-white">
      <div class="row items-center">
        <div class="col">
          <div class="text-h6">Preview Soal</div>
          <div class="text-caption">
            {{ questionsStore.validQuestions.length }} soal valid,
            {{ questionsStore.invalidQuestions.length }} soal error
          </div>
        </div>
        <q-btn flat round icon="close" @click="$emit('cleared')">
          <q-tooltip>Tutup preview</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <!-- Error Summary -->
    <q-banner v-if="questionsStore.hasErrors" class="bg-negative text-white">
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      <b>{{ questionsStore.parseErrors.length }} error ditemukan:</b>
      <ul class="q-mb-none">
        <li v-for="(err, idx) in questionsStore.parseErrors.slice(0, 5)" :key="idx">
          Baris {{ err.row }}: {{ err.message }}
        </li>
        <li v-if="questionsStore.parseErrors.length > 5">
          ...dan {{ questionsStore.parseErrors.length - 5 }} error lainnya
        </li>
      </ul>
    </q-banner>

    <!-- List Soal -->
    <q-list bordered separator>
      <q-item v-for="(q, idx) in questionsStore.parsedQuestions" :key="idx" :class="{ 'bg-red-1': q._error }">
        <q-item-section avatar>
          <q-avatar :color="q._error ? 'negative' : 'primary'" text-color="white">
            {{ q._rowNumber || idx + 1 }}
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label>
            <q-badge :color="getTypeColor(q.question_type)" :label="q.question_type" />
            <span class="q-ml-sm text-weight-medium">
              {{ q.question_text?.substring(0, 100) }}{{ (q.question_text?.length || 0) > 100 ? '...' : '' }}
            </span>
          </q-item-label>

          <q-item-label caption>
            <div class="row q-gutter-sm">
              <span>Bobot: <b>{{ q.score || 10 }}</b></span>
              <span v-if="q.correct_option">| Jawaban: <b>{{ q.correct_option }}</b></span>
              <span v-if="q._error" class="text-negative">
                | Error: {{ q._error }}
              </span>
            </div>
          </q-item-label>

          <!-- Opsi PG -->
          <div v-if="q.question_type === 'PG' && q.options" class="q-mt-xs">
            <q-chip v-for="(opt, key) in q.options" :key="key" dense size="sm"
              :color="q.correct_option === key ? 'positive' : 'grey-3'"
              :text-color="q.correct_option === key ? 'white' : 'black'">
              {{ key }}: {{ opt?.substring(0, 30) }}{{ (opt?.length || 0) > 30 ? '...' : '' }}
            </q-chip>
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Submit Button -->
    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat color="grey" icon="close" label="Batal" @click="$emit('cleared')" />
      <q-btn color="positive" icon="check_circle" :label="`Import ${questionsStore.validQuestions.length} Soal`"
        :loading="questionsStore.isSubmitting" :disable="questionsStore.validQuestions.length === 0"
        @click="confirmSubmit" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useQuestionsStore } from '@/stores/exam/questions'

const props = defineProps({
  examId: { type: String, required: true }
})

const emit = defineEmits(['submitted', 'cleared'])

const $q = useQuasar()
const questionsStore = useQuestionsStore()

const getTypeColor = (type) => {
  const colors = {
    PG: 'blue',
    ESSAY: 'orange',
    MATCHING: 'purple',
    HOTSPOT: 'pink',
    AUDIO: 'teal',
    CODING: 'indigo'
  }
  return colors[type] || 'grey'
}

const confirmSubmit = () => {
  $q.dialog({
    title: 'Konfirmasi Import',
    message: `Import <b>${questionsStore.validQuestions.length}</b> soal ke ujian ini?<br><br>Tindakan ini tidak dapat dibatalkan.`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Ya, Import', color: 'positive', flat: true },
    persistent: true
  }).onOk(async () => {
    try {
      const result = await questionsStore.submitQuestions(props.examId)
      emit('submitted', result)
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.message || 'Gagal mengimport soal'
      })
    }
  })
}
</script>
