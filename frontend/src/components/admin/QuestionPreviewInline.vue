<template>
  <div class="question-preview-inline">
    <!-- Teks soal -->
    <div v-if="question.question_text" class="preview-text" v-html="renderedText" />
    <div v-else class="text-caption text-grey-5 italic">
      Teks soal akan tampil di sini...
    </div>

    <!-- Media soal -->
    <div v-if="question.media_url" class="q-mt-md text-center">
      <img :src="question.media_url" style="max-width: 100%; max-height: 200px; border-radius: 8px" />
    </div>
    <!-- ═══ AUDIO player ═══ -->
    <div v-if="question.question_type === 'AUDIO' && question.media_url" class="q-mt-md">
      <div class="media-player-wrap">
        <audio :src="question.media_url" controls style="width: 100%" />
      </div>
    </div>

    <!-- ═══ VIDEO player ═══ -->
    <div v-if="question.question_type === 'VIDEO' && question.media_url" class="q-mt-md">
      <div class="media-player-wrap">
        <video :src="question.media_url" controls style="width: 100%; max-height: 280px" />
      </div>
    </div>
    <!-- ═══ PG / PG_COMPLEX ═══ -->
    <div v-if="['PG', 'PG_COMPLEX'].includes(question.question_type) && question.options?.length" class="q-mt-md">
      <div v-if="question.question_type === 'PG_COMPLEX'" class="text-caption text-grey-7 q-mb-xs">
        <q-icon name="check_box" size="xs" color="positive" class="q-mr-xs" />
        Multi jawaban ({{(question.options || []).filter((o) => o.is_correct).length}} benar)
      </div>
      <div v-for="(opt, idx) in question.options" :key="opt.id" class="preview-option row items-center q-py-xs no-wrap"
        :class="{ 'preview-option--correct': opt.is_correct }">
        <q-icon :name="question.question_type === 'PG_COMPLEX'
          ? (opt.is_correct ? 'check_box' : 'check_box_outline_blank')
          : (opt.is_correct ? 'radio_button_checked' : 'radio_button_unchecked')"
          :color="opt.is_correct ? 'positive' : 'grey-5'" size="20px" class="q-mr-sm" />
        <span class="text-weight-bold q-mr-sm">{{ label(idx) }}.</span>
        <q-avatar v-if="opt.media_url" size="24px" square class="q-mr-xs">
          <img :src="opt.media_url" />
        </q-avatar>
        <span :class="{ 'text-positive text-weight-bold': opt.is_correct }">
          {{ opt.text || (opt.is_other ? 'Lainnya' : '(...)') }}
        </span>
      </div>
    </div>

    <!-- ═══ ESSAY ═══ -->
    <div v-if="question.question_type === 'ESSAY' && question.rubric" class="q-mt-md">
      <q-separator class="q-mb-sm" />
      <div class="text-caption text-grey-7">
        <b>Rubrik:</b> {{ question.rubric }}
      </div>
    </div>
    <!-- ═══ TRUE_FALSE ═══ -->
    <div v-if="question.question_type === 'TRUE_FALSE' && question.statements?.length" class="q-mt-md">
      <q-separator class="q-mb-sm" />
      <div class="text-caption text-grey-7 q-mb-sm">
        <q-icon name="rule" size="xs" class="q-mr-xs" />
        {{ question.statements.length }} pernyataan
      </div>
      <div v-for="(s, i) in question.statements" :key="s.id" class="tf-item row items-center q-py-xs q-px-sm no-wrap"
        :class="s.correct ? 'tf-item--true' : 'tf-item--false'">
        <span class="text-weight-bold q-mr-sm">{{ i + 1 }}.</span>
        <span class="col">{{ s.text }}</span>
        <q-badge :color="s.correct ? 'positive' : 'negative'" :label="s.correct ? 'BENAR' : 'SALAH'" class="q-ml-sm" />
      </div>
    </div>

    <!-- ═══ SHORT_ANSWER ═══ -->
    <div v-if="question.question_type === 'SHORT_ANSWER' && question.accepted_answers?.length" class="q-mt-md">
      <q-separator class="q-mb-sm" />
      <div class="text-caption text-grey-7 q-mb-sm">
        <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
        Jawaban diterima ({{ question.accepted_answers.length }})
      </div>
      <div class="row q-gutter-xs">
        <q-chip v-for="(a, i) in question.accepted_answers" :key="a.id || i" color="green-1" text-color="green-9"
          icon="check" dense>
          {{ a.text || a }}
        </q-chip>
      </div>
      <div class="text-caption text-grey-6 q-mt-xs">
        <q-icon name="info" size="xs" class="q-mr-xs" />
        {{ question.case_sensitive ? 'Case sensitive' : 'Case insensitive' }}
        · {{ question.trim_whitespace ? 'Trim spasi' : 'Spasi dipertahankan' }}
      </div>
    </div>

    <!-- ═══ CODING ═══ -->
    <div v-if="question.question_type === 'CODING'" class="q-mt-md">
      <q-separator class="q-mb-sm" />
      <div class="row items-center q-gutter-xs q-mb-sm">
        <q-badge color="primary" :label="(question.language || 'code').toUpperCase()" />
        <span class="text-caption text-grey-7">
          {{ (question.test_cases || []).length }} test case
        </span>
      </div>
      <div v-if="question.starter_code" class="code-preview">
        <pre>{{ question.starter_code }}</pre>
      </div>
      <div v-if="question.test_cases?.length" class="q-mt-sm">
        <div class="text-caption text-grey-7 q-mb-xs">Test Cases:</div>
        <div v-for="(tc, i) in question.test_cases" :key="tc.id" class="tc-preview"
          :class="{ 'tc-preview--hidden': tc.is_hidden }">
          <q-badge :color="tc.is_hidden ? 'orange' : 'blue'" :label="tc.is_hidden ? 'HIDDEN' : `#${i + 1}`"
            class="q-mr-xs" />
          <span class="text-caption">
            input: <code>{{ tc.input }}</code>
            → output: <code>{{ tc.expected_output }}</code>
          </span>
        </div>
      </div>
    </div>

    <!-- ═══ HOTSPOT ═══ -->
    <div v-if="question.question_type === 'HOTSPOT' && question.image_url" class="q-mt-md">
      <q-separator class="q-mb-sm" />
      <div class="text-caption text-grey-7 q-mb-sm">
        <q-icon name="touch_app" size="xs" class="q-mr-xs" />
        {{ (question.hotspots || []).length }} area ·
        {{(question.hotspots || []).filter((h) => h.is_correct).length}} benar
      </div>
      <div class="hotspot-preview-wrap">
        <img :src="question.image_url" class="hotspot-preview-image" />
        <div v-for="(m, idx) in question.hotspots" :key="m.id" class="hotspot-preview-marker"
          :class="m.is_correct ? 'hotspot-preview-marker--correct' : 'hotspot-preview-marker--wrong'" :style="{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: `${m.radius * 2}%`,
            height: `${m.radius * 2}%`,
          }">
          <span class="hotspot-preview-label">{{ m.label || idx + 1 }}</span>
        </div>
      </div>
    </div>

    <!-- ═══ MENJODOHKAN ═══ -->
    <div v-if="question.question_type === 'MATCHING' && question.pairs?.length" class="q-mt-md">
      <q-separator class="q-mb-sm" />
      <div class="text-caption text-grey-7 q-mb-sm">
        <q-icon name="compare_arrows" size="xs" class="q-mr-xs" />
        {{ question.pairs.length }} pasangan
      </div>
      <div class="matching-grid">
        <div class="matching-col">
          <div class="text-caption text-weight-bold text-grey-7 q-mb-xs">Premis</div>
          <div v-for="(p, i) in question.pairs" :key="`L-${p.id}`" class="matching-item matching-item--left">
            <span class="text-weight-bold q-mr-xs">{{ i + 1 }}.</span>
            <span v-html="p.left || '(...)'" />
          </div>
        </div>
        <div class="matching-col matching-col--right">
          <div class="text-caption text-weight-bold text-grey-7 q-mb-xs">Jawaban</div>
          <div v-for="p in shuffledPairs" :key="`R-${p.id}`" class="matching-item matching-item--right">
            <span v-html="p.right || '(...)'" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({
  question: { type: Object, required: true },
})

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const label = (idx) => LABELS[idx] || `#${idx + 1}`

const renderedText = computed(() => {
  let html = props.question?.question_text || ''
  html = html.replace(/\$([^$]+)\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr, { throwOnError: false })
    } catch {
      return `$${expr}$`
    }
  })
  return html
})

/**
 * Shuffle untuk tampilan preview (biar terlihat jawaban tidak
 * berurutan sama seperti premis).
 */
const shuffledPairs = computed(() => {
  const pairs = props.question?.pairs || []
  if (pairs.length <= 1) return pairs
  // Deterministic shuffle by index reverse — cukup untuk preview
  return [...pairs].sort((a, b) => a.id.localeCompare(b.id))
})
</script>

<style scoped>
.preview-text {
  font-size: 14px;
  line-height: 1.6;
}

.preview-text :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}

.preview-option {
  border-radius: 6px;
  padding-left: 8px;
  padding-right: 8px;
  transition: background-color 0.15s;
}

.preview-option--correct {
  background: #e8f5e9;
}

.matching-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.matching-col {
  background: #fafafa;
  border-radius: 6px;
  padding: 8px;
}

.matching-col--right {
  background: #f0f7ff;
}

.matching-item {
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.matching-item--left {
  border-left: 3px solid #1976d2;
}

.matching-item--right {
  border-left: 3px solid #43a047;
}

.tf-item {
  border-radius: 6px;
  margin-bottom: 4px;
}

.tf-item--true {
  background: #e8f5e9;
  border-left: 3px solid #2e7d32;
}

.tf-item--false {
  background: #ffebee;
  border-left: 3px solid #c62828;
}

.media-player-wrap {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.code-preview {
  background: #263238;
  color: #eceff1;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.code-preview pre {
  margin: 0;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.tc-preview {
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #f5f5f5;
  border-left: 3px solid #1976d2;
  border-radius: 4px;
  font-size: 12px;
}

.tc-preview--hidden {
  border-left-color: #f57c00;
  background: #fff8e1;
}

.tc-preview code {
  background: #ffffff;
  padding: 1px 4px;
  border-radius: 3px;
  color: #c62828;
}

.hotspot-preview-wrap {
  position: relative;
  display: inline-block;
  max-width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.hotspot-preview-image {
  display: block;
  max-width: 100%;
  max-height: 320px;
}

.hotspot-preview-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
}

.hotspot-preview-marker--correct {
  background: rgba(76, 175, 80, 0.4);
  border-color: #2e7d32;
}

.hotspot-preview-marker--wrong {
  background: rgba(244, 67, 54, 0.4);
  border-color: #c62828;
}

.hotspot-preview-label {
  font-size: 9px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  padding: 0 4px;
  white-space: nowrap;
}
</style>
