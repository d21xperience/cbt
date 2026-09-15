<template>
  <div class="essay-question">
    <q-input
      :model-value="modelValue"
      @update:model-value="(val) => $emit('update:modelValue', val)"
      type="textarea"
      outlined
      rows="8"
      label="Tulis jawaban Anda di sini..."
      class="bg-white"
    />
  </div>
</template>

<script setup>
defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>
