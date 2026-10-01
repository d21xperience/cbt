<!-- src/components/questions/VideoQuestion.vue -->
<template>
  <div class="video-question q-gutter-md">
    <!-- Video Player -->
    <div class="video-player-container bg-grey-2 q-pa-md rounded-borders">
      <div class="row items-center q-gutter-sm q-mb-sm">
        <q-icon name="videocam" size="24px" color="primary" />
        <div class="text-subtitle2">Tonton video berikut:</div>
      </div>
      <div class="video-wrap">
        <video ref="videoRef" :src="videoUrl" controls class="video-player" preload="metadata" playsinline
          @error="onVideoError">
          Browser Anda tidak mendukung pemutar video.
        </video>
      </div>
      <div v-if="videoError" class="text-negative text-caption q-mt-xs">
        ⚠️ Video gagal dimuat. Periksa koneksi Anda.
      </div>
    </div>

    <!-- Pilihan Jawaban -->
    <div class="video-options">
      <div v-for="(text, key) in parsedOptions" :key="key" class="video-option"
        :class="{ 'video-option--selected': modelValue === key }" role="radio" :aria-checked="modelValue === key"
        tabindex="0" @click="selectOption(key)" @keydown.enter.prevent="selectOption(key)"
        @keydown.space.prevent="selectOption(key)">
        <q-radio :model-value="modelValue" :val="key" color="primary" class="video-option-radio"
          @update:model-value="selectOption" />
        <MathText :content="`<b>${key}.</b> ${text}`" class="video-option-text" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue'])
const videoRef = ref(null)
const videoError = ref(false)

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
  // Hapus key video_url karena bukan opsi jawaban
  // eslint-disable-next-line no-unused-vars
  const { video_url, ...answers } = opts
  return answers
})

const videoUrl = computed(() => {
  let opts = props.question.options
  if (typeof opts === 'string') {
    try {
      opts = JSON.parse(opts)
    } catch (e) {
      console.log(e)
      opts = {}
    }
  }
  return opts.video_url || props.question.media_url
})

const selectOption = (key) => emit('update:modelValue', key)

const onVideoError = () => {
  videoError.value = true
}
</script>

<style scoped>
.video-question {
  display: flex;
  flex-direction: column;
}

.video-player-container {
  border-radius: 10px;
}

.video-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 8px;
  background: #000;
}

.video-player {
  display: block;
  width: 100%;
  max-height: 60vh;
  border-radius: 8px;
}

.video-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-option {
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

.video-option:hover {
  border-color: #90caf9;
  background: #f5f9ff;
}

.video-option:active {
  background: #e3f2fd;
}

.video-option--selected {
  border-color: #1976d2;
  background: #e3f2fd;
  box-shadow: 0 0 0 1px #1976d2 inset;
}

.video-option:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.video-option-radio {
  flex-shrink: 0;
  padding: 0;
}

.video-option-text {
  margin-left: 10px;
  flex: 1;
  --math-text-size: clamp(0.92rem, 2.6vw, 1rem);
}

@media (max-width: 599px) {
  .video-option {
    padding: 12px 14px;
    min-height: 52px;
  }

  .video-player {
    max-height: 45vh;
  }
}
</style>
