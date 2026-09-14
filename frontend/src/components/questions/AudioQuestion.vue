<!-- src/components/questions/AudioQuestion.vue -->
<template>
  <div class="audio-question q-gutter-md">
    <!-- Audio Player -->
    <div class="audio-player-container bg-grey-2 q-pa-md rounded-borders">
      <div class="row items-center q-gutter-sm">
        <q-icon name="headphones" size="24px" color="primary" />
        <div class="text-subtitle2">Dengarkan audio berikut:</div>
      </div>
      <audio ref="audioRef" :src="audioUrl" controls class="full-width q-mt-sm" preload="metadata"
        @error="onAudioError">
        Browser Anda tidak mendukung pemutar audio.
      </audio>
      <div v-if="audioError" class="text-negative text-caption q-mt-xs">
        ⚠️ Audio gagal dimuat. Periksa koneksi Anda.
      </div>
    </div>

    <!-- Pilihan Jawaban -->
    <div v-for="(text, key) in parsedOptions" :key="key" class="q-pa-sm rounded-borders cursor-pointer row items-center"
      :class="{ 'bg-blue-1': modelValue === key }" @click="selectOption(key)">
      <q-radio :model-value="modelValue" :val="key" @update:model-value="selectOption" color="primary" />
      <MathText :content="`<b>${key}.</b> ${text}`" class="q-ml-sm" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])
const audioRef = ref(null)
const audioError = ref(false)

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
  // Hapus key audio_url karena bukan opsi jawaban
  // eslint-disable-next-line no-unused-vars
  const { audio_url, ...answers } = opts
  return answers
})

const audioUrl = computed(() => {
  let opts = props.question.options
  if (typeof opts === 'string') {
    try {
      opts = JSON.parse(opts)
    } catch (e) {
      console.log(e)
      opts = {}
    }
  }
  return opts.audio_url || props.question.media_url
})

const selectOption = (key) => emit('update:modelValue', key)
const onAudioError = () => { audioError.value = true }
</script>
