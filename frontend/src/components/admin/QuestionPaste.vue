<!-- src/components/admin/QuestionPaste.vue -->
<template>
  <div class="question-paste">
    <q-banner class="bg-blue-1 text-blue-9 q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="info" color="primary" />
      </template>
      Tambahkan soal satu per satu atau beberapa sekaligus via form.
    </q-banner>

    <!-- Form Tambah Soal -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">Tambah Soal Baru</div>

        <q-form @submit.prevent="addQuestion" class="q-gutter-md">
          <div class="row q-gutter-md">
            <q-select
              v-model="form.question_type"
              :options="questionTypes"
              label="Tipe Soal"
              outlined
              emit-value
              map-options
              class="col-4"
              dense
            />

            <q-input
              v-model.number="form.score"
              label="Bobot Nilai"
              type="number"
              outlined
              class="col-2"
              dense
              :rules="[(val) => val > 0 || 'Bobot harus > 0']"
            />
          </div>

          <q-input
            v-model="form.question_text"
            label="Teks Soal (support LaTeX: $...$ atau $$...$$)"
            type="textarea"
            outlined
            autogrow
            :rules="[(val) => !!val || 'Teks soal wajib diisi']"
          />

          <!-- Opsi untuk PG -->
          <div v-if="form.question_type === 'PG'" class="q-gutter-sm">
            <div class="text-subtitle2">Pilihan Jawaban:</div>
            <div class="row q-gutter-sm">
              <q-input
                v-for="opt in ['A', 'B', 'C', 'D']"
                :key="opt"
                v-model="form.options[opt]"
                :label="`Opsi ${opt}`"
                outlined
                dense
                class="col"
                :rules="[(val) => (form.question_type === 'PG' && !!val) || 'Opsi wajib diisi']"
              />
            </div>

            <q-select
              v-model="form.correct_option"
              :options="['A', 'B', 'C', 'D']"
              label="Jawaban Benar"
              outlined
              dense
              class="col-3"
              :rules="[(val) => !!val || 'Jawaban benar wajib dipilih']"
            />
          </div>

          <!-- Rubric untuk ESSAY -->
          <q-input
            v-if="form.question_type === 'ESSAY'"
            v-model="form.rubric"
            label="Rubrik Penilaian (opsional)"
            type="textarea"
            outlined
            autogrow
          />

          <!-- Media URL -->
          <q-input
            v-model="form.media_url"
            label="URL Media (gambar/audio, opsional)"
            outlined
            dense
          />

          <div class="row q-gutter-sm">
            <q-btn type="submit" color="primary" icon="add" label="Tambah ke Daftar" />
            <q-btn flat color="grey" icon="clear" label="Reset Form" @click="resetForm" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <!-- List Soal yang Sudah Ditambahkan -->
    <div v-if="localQuestions.length > 0">
      <div class="text-subtitle1 q-mb-sm">
        Soal yang akan di-import ({{ localQuestions.length }})
      </div>

      <q-list bordered separator>
        <q-item v-for="(q, idx) in localQuestions" :key="idx">
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white">
              {{ idx + 1 }}
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>
              <q-badge
                :color="q.question_type === 'PG' ? 'blue' : 'orange'"
                :label="q.question_type"
              />
              <span class="q-ml-sm"
                >{{ q.question_text.substring(0, 80)
                }}{{ q.question_text.length > 80 ? '...' : '' }}</span
              >
            </q-item-label>
            <q-item-label caption>
              Bobot: {{ q.score }} poin
              <span v-if="q.correct_option"> | Jawaban: {{ q.correct_option }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn flat round dense icon="delete" color="negative" @click="removeQuestion(idx)" />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="row q-gutter-sm q-mt-md">
        <q-btn color="positive" icon="check" label="Lanjut ke Preview" @click="submitToPreview" />
        <q-btn flat color="negative" icon="delete_sweep" label="Hapus Semua" @click="clearAll" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useQuestionsStore } from '@/stores/exam/questions'

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  examId: { type: String, required: true },
})

const emit = defineEmits(['parsed'])

const $q = useQuasar()
const questionsStore = useQuestionsStore()

const localQuestions = ref([])

const questionTypes = [
  { label: 'Pilihan Ganda (PG)', value: 'PG' },
  { label: 'Essay', value: 'ESSAY' },
]

const form = reactive({
  question_type: 'PG',
  question_text: '',
  options: { A: '', B: '', C: '', D: '' },
  correct_option: '',
  score: 10,
  media_url: '',
  rubric: '',
})

const addQuestion = () => {
  // Validasi
  if (!form.question_text.trim()) {
    $q.notify({ type: 'negative', message: 'Teks soal wajib diisi' })
    return
  }

  if (form.question_type === 'PG') {
    if (!form.options.A || !form.options.B || !form.options.C || !form.options.D) {
      $q.notify({ type: 'negative', message: 'Semua opsi PG wajib diisi' })
      return
    }
    if (!form.correct_option) {
      $q.notify({ type: 'negative', message: 'Jawaban benar wajib dipilih' })
      return
    }
  }

  // Tambahkan ke list
  localQuestions.value.push({
    question_type: form.question_type,
    question_text: form.question_text,
    options: form.question_type === 'PG' ? { ...form.options } : {},
    correct_option: form.question_type === 'PG' ? form.correct_option : null,
    score: form.score,
    media_url: form.media_url || null,
    rubric: form.rubric || null,
  })

  resetForm()

  $q.notify({
    type: 'positive',
    message: 'Soal berhasil ditambahkan',
    timeout: 1500,
  })
}

const removeQuestion = (idx) => {
  localQuestions.value.splice(idx, 1)
}

const clearAll = () => {
  $q.dialog({
    title: 'Konfirmasi',
    message: 'Hapus semua soal yang sudah ditambahkan?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    localQuestions.value = []
  })
}

const resetForm = () => {
  form.question_type = 'PG'
  form.question_text = ''
  form.options = { A: '', B: '', C: '', D: '' }
  form.correct_option = ''
  form.score = 10
  form.media_url = ''
  form.rubric = ''
}

const submitToPreview = () => {
  questionsStore.setPastedQuestions(localQuestions.value)
  emit('parsed')
}
</script>
