<!-- src/components/questions/PGComplexQuestion.vue -->
<template>
  <div class="pgc-question">
    <div class="pgc-hint text-caption text-grey-7 q-mb-sm">
      <q-icon name="check_box" size="xs" />
      Pilih <b>lebih dari satu</b> jawaban yang benar.
    </div>

    <div
      v-for="opt in options"
      :key="opt.id"
      class="pgc-option"
      :class="{ 'pgc-option--selected': isSelected(opt.id) }"
      role="checkbox"
      :aria-checked="isSelected(opt.id)"
      tabindex="0"
      @click="toggle(opt.id)"
      @keydown.enter.prevent="toggle(opt.id)"
      @keydown.space.prevent="toggle(opt.id)"
    >
      <q-checkbox
        :model-value="isSelected(opt.id)"
        color="primary"
        class="pgc-checkbox"
        @update:model-value="() => toggle(opt.id)"
        @click.stop
      />
      <MathText :content="opt.text" class="pgc-text" />
    </div>

    <div v-if="options.length === 0" class="text-caption text-grey-6 text-center q-pa-md">
      Tidak ada opsi.
    </div>

    <div v-else class="text-caption text-grey-7 q-mt-xs">
      <q-icon name="info" size="xs" />
      {{ selectedCount }} dipilih.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const options = computed(() => {
  const raw = props.question.options
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

const selectedCount = computed(() => props.modelValue.length)

const isSelected = (id) => props.modelValue.includes(id)

const toggle = (id) => {
  const current = props.modelValue || []
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.pgc-question {
  display: flex;
  flex-direction: column;
}

.pgc-option {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  margin-bottom: 8px;
}

.pgc-option:hover {
  border-color: #90caf9;
  background: #f5f9ff;
}

.pgc-option:active {
  background: #e3f2fd;
}

.pgc-option--selected {
  border-color: #1976d2;
  background: #e3f2fd;
  box-shadow: 0 0 0 1px #1976d2 inset;
}

.pgc-option:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.pgc-checkbox {
  flex-shrink: 0;
  padding: 0;
}

.pgc-text {
  margin-left: 10px;
  flex: 1;
  --math-text-size: clamp(0.92rem, 2.6vw, 1rem);
}

@media (max-width: 599px) {
  .pgc-option {
    padding: 12px 14px;
    min-height: 52px;
  }
}
</style>
