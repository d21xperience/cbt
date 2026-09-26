<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon :name="isAudio ? 'audiotrack' : 'videocam'" color="primary" class="q-mr-xs" />
        {{ isAudio ? 'Audio Soal' : 'Video Soal' }}
      </div>
      <div class="text-caption text-grey-7">
        Upload base64 (max 1 MB) atau masukkan URL
      </div>
    </div>

    <q-card flat bordered class="bg-white">
      <q-card-section class="q-gutter-md">
        <!-- URL Input -->
        <q-input :model-value="modelValue" :label="isAudio ? 'URL Audio' : 'URL Video'" outlined dense
          :hint="isAudio ? 'MP3/WAV/OGG' : 'MP4/WebM'" @update:model-value="$emit('update:modelValue', $event)">
          <template v-slot:prepend>
            <q-icon :name="isAudio ? 'audiotrack' : 'videocam'" />
          </template>
          <template v-slot:append>
            <q-btn flat round dense icon="upload_file" color="primary" @click="pickFile">
              <q-tooltip>Upload file</q-tooltip>
            </q-btn>
            <q-btn v-if="modelValue" flat round dense icon="clear" color="grey-6"
              @click="$emit('update:modelValue', '')">
              <q-tooltip>Clear</q-tooltip>
            </q-btn>
          </template>
        </q-input>

        <!-- Preview player -->
        <div v-if="modelValue" class="media-preview">
          <audio v-if="isAudio" :src="modelValue" controls style="width: 100%" />
          <video v-else :src="modelValue" controls style="width: 100%; max-height: 320px" />
        </div>

        <div v-else class="media-empty">
          <q-icon :name="isAudio ? 'audiotrack' : 'videocam'" size="48px" color="grey-4" />
          <div class="text-caption text-grey-6 q-mt-sm">
            Belum ada {{ isAudio ? 'audio' : 'video' }}
          </div>
        </div>
      </q-card-section>
    </q-card>

    <input ref="fileInput" type="file" :accept="acceptAttr" hidden @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: String, default: '' },
  isAudio: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const fileInput = ref(null)

const MAX_SIZE = 1 * 1024 * 1024 // 1 MB

const acceptAttr = computed(() =>
  props.isAudio
    ? 'audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/m4a'
    : 'video/mp4,video/webm,video/ogg',
)

const pickFile = () => fileInput.value?.click()

const onFileSelected = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  if (file.size > MAX_SIZE) {
    $q.notify({
      type: 'negative',
      message: `Ukuran ${props.isAudio ? 'audio' : 'video'} max 1 MB.`,
    })
    e.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    emit('update:modelValue', reader.result)
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}
</script>

<style scoped>
.media-preview {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.media-empty {
  padding: 24px;
  text-align: center;
  background: #fafafa;
  border: 1px dashed #e0e0e0;
  border-radius: 6px;
}
</style>
