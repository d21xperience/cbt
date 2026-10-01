<!-- src/components/questions/QuestionRenderer.vue -->
<template>
  <div v-if="question" class="question-renderer">
    <!-- Header soal: nomor + tipe + skor -->
    <div class="qr-header row items-center q-mb-md">
      <div class="qr-number">{{ question.order_no || '?' }}</div>
      <div class="text-caption text-grey-7 q-ml-sm">
        {{ question.question_type || 'SOAL' }}
        <span v-if="question.score"> • {{ question.score }} poin</span>
      </div>
    </div>

    <!-- Teks soal -->
    <div class="qr-question-text q-mb-md">
      <MathText :content="question.question_text" class="qr-question-math" />
    </div>

    <!-- Media gambar (dengan scroll container kalau lebar) -->
    <div v-if="question.media_url && isImage" class="qr-media q-mb-md">
      <div class="qr-media-scroll">
        <img :src="question.media_url" class="qr-img" alt="Media soal" />
      </div>
    </div>

    <!-- Area opsi / jawaban — dibungkus qr-body untuk styling child -->
    <div class="qr-body">
      <PGQuestion v-if="question.question_type === 'PG'" :question="question" :model-value="currentAnswer"
        @update:model-value="(val) => $emit('update:answer', val)" />

      <EssayQuestion v-else-if="question.question_type === 'ESSAY'" :question="question" :model-value="currentAnswer"
        @update:model-value="(val) => $emit('update:answer', val)" />

      <AudioQuestion v-else-if="question.question_type === 'AUDIO'" :question="question" :model-value="currentAnswer"
        @update:model-value="(val) => $emit('update:answer', val)" />
      <TrueFalseQuestion v-else-if="question.question_type === 'TRUE_FALSE'" :question="question"
        :model-value="currentAnswer || {}" @update:model-value="(val) => $emit('update:answer', val)" />

      <ShortAnswerQuestion v-else-if="question.question_type === 'SHORT_ANSWER'" :question="question"
        :model-value="currentAnswer || ''" @update:model-value="(val) => $emit('update:answer', val)" />

      <MatchingQuestion v-else-if="question.question_type === 'MATCHING'" :question="question"
        :model-value="currentAnswer || {}" @update:model-value="(val) => $emit('update:answer', val)" />

      <PGComplexQuestion v-else-if="question.question_type === 'PG_COMPLEX'" :question="question"
        :model-value="Array.isArray(currentAnswer) ? currentAnswer : []"
        @update:model-value="(val) => $emit('update:answer', val)" />
      <CodingQuestion v-else-if="question.question_type === 'CODING'" :question="question" :model-value="currentAnswer"
        @update:model-value="(val) => $emit('update:answer', val)" />

      <HotspotQuestion v-else-if="question.question_type === 'HOTSPOT'" :question="question"
        :model-value="Array.isArray(currentAnswer) ? currentAnswer : []"
        @update:model-value="(val) => $emit('update:answer', val)" />
      <VideoQuestion v-else-if="question.question_type === 'VIDEO'" :question="question" :model-value="currentAnswer"
        @update:model-value="(val) => $emit('update:answer', val)" />
      <div v-else class="text-negative text-center q-pa-md">
        Tipe soal "{{ question.question_type }}" belum didukung.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PGQuestion from './PGQuestion.vue'
import EssayQuestion from './EssayQuestion.vue'
import AudioQuestion from './AudioQuestion.vue'
import MathText from '@/components/ui/MathText.vue'
import TrueFalseQuestion from './TrueFalseQuestion.vue'
import ShortAnswerQuestion from './ShortAnswerQuestion.vue'
import MatchingQuestion from './MatchingQuestion.vue'
import PGComplexQuestion from './PGComplexQuestion.vue'
import CodingQuestion from './CodingQuestion.vue'
import HotspotQuestion from './HotspotQuestion.vue'
import VideoQuestion from './VideoQuestion.vue'

const props = defineProps({
  question: { type: Object, required: true },
  answer: { type: [String, Object], default: null },
})

defineEmits(['update:answer'])

const currentAnswer = computed(() => props.answer)
const isImage = computed(() => /\.(jpg|jpeg|png|gif|webp)$/i.test(props.question.media_url || ''))
</script>

<style scoped>
/* ── Card container */
.question-renderer {
  background: #fff;
  border-radius: 12px;
  padding: clamp(14px, 3.5vw, 20px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

/* ── Header nomor soal */
.qr-header {
  gap: 4px;
}

.qr-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--q-primary, #1976d2);
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* ── Teks soal */
.qr-question-text {
  font-weight: 500;
  color: #1a1a1a;
}

.qr-question-math {
  --math-text-size: clamp(1rem, 3vw, 1.15rem);
  display: block;
}

/* ── Media */
.qr-media-scroll {
  max-width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  background: #fafafa;
  padding: 6px;
  -webkit-overflow-scrolling: touch;
}

.qr-img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* ── Deep: style komponen child (opsi jawaban) */
.qr-body :deep(.q-radio__inner) {
  font-size: 1.1rem;
}

.qr-body :deep(.q-radio) {
  min-height: 24px;
}

@media (max-width: 599px) {
  .qr-number {
    width: 26px;
    height: 26px;
    font-size: 0.8rem;
  }

  /* Media di mobile biar bisa scroll kalau lebar */
  .qr-media-scroll {
    margin-left: -4px;
    margin-right: -4px;
    padding-left: 4px;
    padding-right: 4px;
  }
}
</style>
