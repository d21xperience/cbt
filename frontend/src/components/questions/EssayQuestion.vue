<template>
  <div class="essay-question">
    <q-input :model-value="modelValue" @update:model-value="(val) => $emit('update:modelValue', val)" type="textarea"
      outlined :rows="rows" :input-style="inputStyle" label="Tulis jawaban Anda di sini..." class="bg-white" counter
      :maxlength="maxLength" />
    <div class="text-caption text-grey-7 q-mt-xs">
      <q-icon name="info" size="xs" /> Jawaban akan tersimpan otomatis.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'

defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const $q = useQuasar()

// rows adaptive: mobile 6, desktop 8
const rows = computed(() => ($q.screen.lt.md ? 6 : 8))
const maxLength = 10000
const inputStyle = computed(
  () => 'font-size: clamp(0.95rem, 2.6vw, 1.05rem); line-height: 1.55;',
)
</script>
