<!-- src/components/questions/CodingQuestion.vue -->
<template>
  <div class="coding-question">
    <!-- Language badge -->
    <div class="coding-header">
      <q-badge color="primary" outline class="coding-lang-badge">
        <q-icon name="code" size="14px" class="q-mr-xs" />
        {{ languageLabel }}
      </q-badge>
      <span class="text-caption text-grey-7">
        Tulis kode, lalu sistem uji otomatis.
      </span>
    </div>

    <!-- Test cases (non-hidden) -->
    <div v-if="visibleTestCases.length > 0" class="coding-tests">
      <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
        Contoh Pengujian ({{ visibleTestCases.length }})
      </div>
      <div class="coding-test-list">
        <div v-for="(tc, idx) in visibleTestCases" :key="tc.id" class="coding-test-row">
          <div class="coding-test-num">{{ idx + 1 }}</div>
          <div class="coding-test-content">
            <div class="coding-test-line">
              <span class="coding-test-label">Input:</span>
              <code class="coding-test-value">{{ tc.input }}</code>
            </div>
            <div class="coding-test-line">
              <span class="coding-test-label">Output:</span>
              <code class="coding-test-value">{{ tc.expected_output }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Code editor -->
    <div class="coding-editor">
      <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
        Kode Anda
      </div>
      <q-input :model-value="currentCode" type="textarea" outlined autogrow :input-style="inputStyle"
        class="coding-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"
        @update:model-value="onCodeChange">
        <template v-slot:prepend>
          <q-icon name="terminal" color="primary" />
        </template>
      </q-input>
      <div class="text-caption text-grey-7 q-mt-xs">
        <q-icon name="info" size="xs" />
        Kode disimpan otomatis. Indentasi pakai spasi.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: [Object, String], default: null },
})

const emit = defineEmits(['update:modelValue'])

const LANG_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  php: 'PHP',
  sql: 'SQL',
  pseudo: 'Pseudo-code',
}

const languageLabel = computed(
  () => LANG_LABELS[props.question.language] || (props.question.language || 'Code'),
)

const visibleTestCases = computed(() => {
  const raw = props.question.test_cases
  if (!Array.isArray(raw)) return []
  return raw.filter((tc) => !tc.is_hidden)
})

const currentCode = computed(() => {
  const mv = props.modelValue
  if (mv && typeof mv === 'object' && typeof mv.code === 'string') return mv.code
  if (typeof mv === 'string') return mv
  return props.question.starter_code || ''
})

const inputStyle =
  'font-family: "Consolas", "Menlo", "Monaco", monospace; font-size: clamp(0.85rem, 2.4vw, 0.95rem); line-height: 1.55;'

const onCodeChange = (val) => {
  emit('update:modelValue', {
    language: props.question.language || 'javascript',
    code: val,
  })
}
</script>

<style scoped>
.coding-question {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.coding-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.coding-lang-badge {
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* ── Test cases ── */
.coding-tests {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fafafa;
  padding: 10px 12px;
}

.coding-test-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coding-test-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.coding-test-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.coding-test-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coding-test-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.82rem;
  flex-wrap: wrap;
}

.coding-test-label {
  color: #666;
  font-weight: 600;
  flex-shrink: 0;
}

.coding-test-value {
  font-family: 'Consolas', 'Menlo', 'Monaco', monospace;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1px 6px;
  color: #1a1a1a;
  word-break: break-all;
}

/* ── Editor ── */
.coding-editor {
  display: flex;
  flex-direction: column;
}

.coding-input :deep(textarea) {
  font-family: 'Consolas', 'Menlo', 'Monaco', monospace !important;
  font-size: clamp(0.85rem, 2.4vw, 0.95rem) !important;
  line-height: 1.55 !important;
  tab-size: 2;
}

.coding-input :deep(.q-field__control) {
  min-height: 180px;
}

@media (max-width: 599px) {
  .coding-input :deep(.q-field__control) {
    min-height: 200px;
  }

  .coding-test-row {
    padding: 4px 0;
  }
}
</style>
