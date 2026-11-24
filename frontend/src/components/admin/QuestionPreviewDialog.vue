<template>
  <q-dialog v-model="isOpen" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="column full-height">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <div class="text-h6">
          <q-icon name="visibility" class="q-mr-sm" />
          Preview Soal: {{ examTitle || 'Memuat...' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- Content -->
      <q-card-section class="col q-pa-md scroll" style="background-color: #f5f5f5">
        <div v-if="loading" class="flex flex-center" style="height: 100%">
          <q-spinner-dots color="primary" size="50px" />
          <div class="text-h6 q-ml-md">Memuat soal...</div>
        </div>

        <div v-else-if="questions.length === 0" class="flex flex-center text-grey-6" style="height: 100%">
          <div class="text-center">
            <q-icon name="inbox" size="80px" color="grey-4" />
            <div class="text-h6 q-mt-md">Belum ada soal</div>
            <div class="text-caption">Silakan tambahkan soal melalui halaman editor.</div>
          </div>
        </div>

        <div v-else class="q-gutter-y-md">
          <q-card v-for="(q, index) in questions" :key="q.id" flat bordered>
            <q-card-section>
              <div class="row items-start q-mb-md">
                <q-badge color="primary" class="q-mr-sm text-subtitle1">No. {{ index + 1 }}</q-badge>
                <q-badge color="grey-7" class="q-mr-sm">{{ q.question_type }}</q-badge>
                <q-badge color="teal" outline>Skor: {{ q.score }}</q-badge>
              </div>

              <!-- Teks Soal -->
              <div class="text-body1 q-mb-md" style="white-space: pre-wrap">{{ q.question_text }}</div>

              <!-- Media (jika ada) -->
              <div v-if="q.media_url" class="q-mb-md">
                <q-img :src="q.media_url" style="max-width: 400px; border-radius: 8px" />
              </div>

              <!-- Pilihan Ganda (Array of Objects / Object Biasa) -->
              <div v-if="q.question_type === 'PG' || q.question_type === 'AUDIO'" class="q-gutter-y-sm q-ml-md">
                <div
                  v-for="(opt, optIndex) in normalizeOptions(q.options)"
                  :key="optIndex"
                  class="row items-center q-pa-sm rounded-borders"
                  :class="opt.isCorrect ? 'bg-green-1 text-green-9 text-weight-bold' : 'bg-grey-1'"
                >
                  <q-icon
                    :name="opt.isCorrect ? 'check_circle' : 'radio_button_unchecked'"
                    :color="opt.isCorrect ? 'positive' : 'grey-6'"
                    class="q-mr-sm"
                  />
                  <span class="text-weight-bold q-mr-sm">{{ getLetter(optIndex) }}.</span>
                  <span>{{ opt.text }}</span>
                </div>
              </div>

              <!-- Essay -->
              <div v-else-if="q.question_type === 'ESSAY'" class="q-pa-sm bg-orange-1 text-orange-9 rounded-borders">
                <q-icon name="edit_note" class="q-mr-sm" />
                <em>Soal Esai (Dinilai Manual)</em>
                <div v-if="q.rubric" class="text-caption q-mt-xs">
                  <strong>Rubrik:</strong> {{ q.rubric }}
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>

      <!-- Footer -->
      <q-card-actions align="right" class="bg-white q-pa-md">
        <div class="text-caption text-grey-7 col">
          Total: {{ questions.length }} soal
        </div>
        <q-btn flat label="Tutup" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ExamService } from '@/services/admin/ExamService'

const props = defineProps({
  modelValue: Boolean,
  examId: { type: String, default: null },
  examTitle: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const loading = ref(false)
const questions = ref([])

watch(() => props.modelValue, async (v) => {
  isOpen.value = v
  if (v && props.examId) {
    await fetchQuestions()
  }
})

watch(isOpen, (v) => emit('update:modelValue', v))

const fetchQuestions = async () => {
  loading.value = true
  questions.value = []
  try {
    const res = await ExamService.listQuestions(props.examId)
    questions.value = Array.isArray(res?.data?.data) ? res.data.data : []
  } catch (err) {
    console.error('Gagal memuat soal:', err)
  } finally {
    loading.value = false
  }
}

// Konversi index ke huruf (0 -> A, 1 -> B, dst)
const getLetter = (index) => String.fromCharCode(65 + index) // 65 = 'A'

// Normalisasi data opsi menjadi format seragam: { text, isCorrect }
const normalizeOptions = (optionsRaw) => {
  if (!optionsRaw) return []
  
  let opts = optionsRaw
  if (typeof optionsRaw === 'string') {
    try {
      opts = JSON.parse(optionsRaw)
    } catch {
      return [] // FIX: variabel 'e' dihapus karena tidak dipakai
    }
  }

  // Jika formatnya Array of Objects (seperti di screenshot)
  if (Array.isArray(opts)) {
    return opts.map(o => ({
      text: o.text || o.label || String(o), // Fallback jika hanya string
      isCorrect: o.is_correct === true
    }))
  }

  // Jika formatnya Object biasa { "A": "Teks A", "B": "Teks B" }
  if (typeof opts === 'object') {
    return Object.values(opts).map((val) => ({
      text: val,
      isCorrect: false // FIX: variabel 'key' dihapus, hanya ambil nilai (val)
    }))
  }

  return []
}
</script>
