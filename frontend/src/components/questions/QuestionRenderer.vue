<!-- src/components/questions/QuestionRenderer.vue -->
<template>
  <div v-if="question" class="question-renderer q-pa-md bg-white shadow-2 rounded-borders">
    <!-- Teks Soal dengan Math Rendering -->
    <MathText :content="question.question_text" class="text-h6 q-mb-md block" />

    <!-- Media (Gambar) -->
    <div v-if="question.media_url && isImage" class="q-mb-md">
      <img :src="question.media_url" class="max-w-full rounded-borders" />
    </div>

    <!-- Switch Komponen berdasarkan Tipe Soal -->
    <PGQuestion
      v-if="question.question_type === 'PG'"
      :question="question"
      :model-value="currentAnswer"
      @update:model-value="(val) => $emit('update:answer', val)"
    />

    <EssayQuestion
      v-else-if="question.question_type === 'ESSAY'"
      :question="question"
      :model-value="currentAnswer"
      @update:model-value="(val) => $emit('update:answer', val)"
    />

    <AudioQuestion
      v-else-if="question.question_type === 'AUDIO'"
      :question="question"
      :model-value="currentAnswer"
      @update:model-value="(val) => $emit('update:answer', val)"
    />

    <div v-else class="text-negative text-center q-pa-md">
      Tipe soal "{{ question.question_type }}" belum didukung.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PGQuestion from './PGQuestion.vue'
import EssayQuestion from './EssayQuestion.vue'
import AudioQuestion from './AudioQuestion.vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  answer: { type: [String, Object], default: null },
})

defineEmits(['update:answer'])

const currentAnswer = computed(() => props.answer)
const isImage = computed(() => /\.(jpg|jpeg|png|gif|webp)$/i.test(props.question.media_url || ''))
</script>
