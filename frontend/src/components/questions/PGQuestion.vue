<!-- src/components/questions/PGQuestion.vue -->
<template>
  <div class="pg-question q-gutter-sm">
    <div v-for="(text, key) in parsedOptions" :key="key" class="q-pa-sm rounded-borders cursor-pointer row items-center"
      :class="{ 'bg-blue-1': modelValue === key }" @click="selectOption(key)">
      <q-radio :model-value="modelValue" :val="key" @update:model-value="selectOption" color="primary" />
      <MathText :content="`<b>${key}.</b> ${text}`" class="q-ml-sm" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: null }
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
