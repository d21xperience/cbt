<!-- src/components/questions/TrueFalseQuestion.vue -->
<template>
  <div class="tf-question">
    <div
      v-for="(stmt, idx) in statements"
      :key="stmt.id"
      class="tf-statement"
    >
      <div class="tf-statement-header">
        <div class="tf-statement-number">{{ idx + 1 }}</div>
        <MathText :content="stmt.text" class="tf-statement-text" />
      </div>

      <div class="tf-statement-actions">
        <button
          type="button"
          class="tf-btn tf-btn--true"
          :class="{ 'tf-btn--selected': modelValue[stmt.id] === true }"
          :aria-pressed="modelValue[stmt.id] === true"
          @click="select(stmt.id, true)"
        >
          <q-icon name="check_circle" size="20px" />
          <span>BENAR</span>
        </button>

        <button
          type="button"
          class="tf-btn tf-btn--false"
          :class="{ 'tf-btn--selected': modelValue[stmt.id] === false }"
          :aria-pressed="modelValue[stmt.id] === false"
          @click="select(stmt.id, false)"
        >
          <q-icon name="cancel" size="20px" />
          <span>SALAH</span>
        </button>
      </div>
    </div>

    <div v-if="statements.length === 0" class="text-caption text-grey-6 text-center q-pa-md">
      Tidak ada pernyataan.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const statements = computed(() => {
  const raw = props.question.statements
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  return raw
})

const select = (statementId, value) => {
  const next = { ...props.modelValue, [statementId]: value }
  emit('update:modelValue', next)
}
</script>

<style scoped>
.tf-question {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tf-statement {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  padding: 12px 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.tf-statement:hover {
  border-color: #90caf9;
}

.tf-statement-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.tf-statement-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tf-statement-text {
  flex: 1;
  --math-text-size: clamp(0.95rem, 2.6vw, 1.05rem);
  line-height: 1.5;
}

.tf-statement-actions {
  display: flex;
  gap: 8px;
}

.tf-btn {
  flex: 1;
  min-height: 44px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  color: #555;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.tf-btn:active {
  transform: scale(0.98);
}

.tf-btn--true.tf-btn--selected {
  background: #e8f5e9;
  border-color: #2e7d32;
  color: #1b5e20;
  box-shadow: 0 0 0 1px #2e7d32 inset;
}

.tf-btn--false.tf-btn--selected {
  background: #ffebee;
  border-color: #c62828;
  color: #b71c1c;
  box-shadow: 0 0 0 1px #c62828 inset;
}

@media (max-width: 599px) {
  .tf-btn {
    min-height: 48px;
  }
}
</style>
