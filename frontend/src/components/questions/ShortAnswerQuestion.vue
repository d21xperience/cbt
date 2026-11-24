<!-- src/components/questions/ShortAnswerQuestion.vue -->
<template>
  <div class="sa-question">
    <q-input
      :model-value="modelValue"
      outlined
      :label="labelText"
      class="bg-white sa-input"
      :input-style="inputStyle"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      @update:model-value="(v) => $emit('update:modelValue', v)"
    >
      <template v-slot:prepend>
        <q-icon name="edit_note" color="primary" />
      </template>
    </q-input>

    <div class="text-caption text-grey-7 q-mt-xs">
      <q-icon name="info" size="xs" />
      Tulis jawaban singkat. Tidak perlu kalimat panjang.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const labelText = computed(() => 'Tulis jawaban Anda di sini...')

const inputStyle = computed(() => 'font-size: clamp(0.95rem, 2.6vw, 1.05rem); line-height: 1.55;')
</script>

<style scoped>
.sa-question {
  display: flex;
  flex-direction: column;
}

.sa-input :deep(.q-field__control) {
  min-height: 48px;
}

@media (max-width: 599px) {
  .sa-input :deep(.q-field__control) {
    min-height: 52px;
  }
}
</style>
