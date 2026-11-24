<!-- src/components/questions/PGQuestion.vue -->
<template>
  <div class="pg-question">
    <div
      v-for="(text, key) in parsedOptions"
      :key="key"
      class="option-item"
      :class="{ 'option-item--selected': modelValue === key }"
      role="radio"
      :aria-checked="modelValue === key"
      tabindex="0"
      @click="selectOption(key)"
      @keydown.enter.prevent="selectOption(key)"
      @keydown.space.prevent="selectOption(key)"
    >
      <q-radio
        :model-value="modelValue"
        :val="key"
        @update:model-value="selectOption"
        color="primary"
        class="option-radio"
      />
      <MathText :content="`<b>${key}.</b> ${text}`" class="option-text" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue'])

const parsedOptions = computed(() => {
  let opts = props.question.options
  if (typeof opts === 'string') {
    try {
      opts = JSON.parse(opts)
    } catch (e) {
      console.log(e)
      opts = {}
    }
  }
  return opts
})

const selectOption = (key) => emit('update:modelValue', key)
</script>

<style scoped>
.pg-question {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.option-item:hover {
  border-color: #90caf9;
  background: #f5f9ff;
}

.option-item:active {
  background: #e3f2fd;
}

.option-item--selected {
  border-color: #1976d2;
  background: #e3f2fd;
  box-shadow: 0 0 0 1px #1976d2 inset;
}

.option-item:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.option-radio {
  flex-shrink: 0;
  padding: 0;
}

.option-text {
  margin-left: 10px;
  flex: 1;
  --math-text-size: clamp(0.92rem, 2.6vw, 1rem);
}

@media (max-width: 599px) {
  .option-item {
    padding: 12px 14px;
    min-height: 52px;
  }
}
</style>
