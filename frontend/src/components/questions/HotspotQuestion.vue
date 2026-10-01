<!-- src/components/questions/HotspotQuestion.vue -->
<template>
  <div class="hotspot-question">
    <div class="hotspot-hint text-caption text-grey-7 q-mb-sm">
      <q-icon name="touch_app" size="xs" />
      Tap pada gambar untuk menandai area. Tap marker untuk menghapus.
    </div>

    <!-- Canvas area -->
    <div class="hotspot-canvas-wrap">
      <div ref="canvasRef" class="hotspot-canvas" :style="{ cursor: loading ? 'wait' : 'crosshair' }"
        @click="onCanvasClick">
        <img :src="imageUrl" class="hotspot-image" alt="Gambar soal" draggable="false" @load="loading = false"
          @error="onImageError" />

        <!-- Markers -->
        <div v-for="(m, idx) in markers" :key="`m-${idx}`" class="hotspot-marker" :style="{
          left: `${m.x}%`,
          top: `${m.y}%`,
        }" @click.stop="removeMarker(idx)">
          <span class="hotspot-marker-label">{{ idx + 1 }}</span>
        </div>
      </div>
    </div>

    <div v-if="imageError" class="text-negative text-caption q-mt-xs">
      ⚠️ Gambar gagal dimuat.
    </div>

    <!-- Counter + clear -->
    <div class="hotspot-footer row items-center justify-between q-mt-sm">
      <div class="text-caption text-grey-7">
        <q-icon name="place" size="xs" />
        {{ markers.length }} / {{ MAX_MARKERS }} titik ditandai
      </div>
      <q-btn v-if="markers.length > 0" flat dense no-caps color="negative" icon="delete_sweep" label="Hapus semua"
        size="sm" @click="clearAll" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const canvasRef = ref(null)
const loading = ref(true)
const imageError = ref(false)

const MAX_MARKERS = 10

const imageUrl = computed(
  () => props.question.image_url || props.question.media_url || '',
)

const markers = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : [],
)

const onImageError = () => {
  imageError.value = true
  loading.value = false
}

const onCanvasClick = (e) => {
  if (loading.value || imageError.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  let x = ((e.clientX - rect.left) / rect.width) * 100
  let y = ((e.clientY - rect.top) / rect.height) * 100

  // Clamp 0-100
  x = Math.max(0, Math.min(100, x))
  y = Math.max(0, Math.min(100, y))

  if (markers.value.length >= MAX_MARKERS) {
    $q.notify({
      type: 'warning',
      message: `Maksimal ${MAX_MARKERS} titik. Hapus salah satu dulu.`,
      timeout: 1800,
    })
    return
  }

  const next = [
    ...markers.value,
    { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 },
  ]
  emit('update:modelValue', next)
}

const removeMarker = (idx) => {
  const next = markers.value.filter((_, i) => i !== idx)
  emit('update:modelValue', next)
  $q.notify({
    message: `Titik ${idx + 1} dihapus`,
    timeout: 1200,
    position: 'top',
    color: 'grey-8',
  })
}

const clearAll = () => {
  emit('update:modelValue', [])
}
</script>

<style scoped>
.hotspot-question {
  display: flex;
  flex-direction: column;
}

.hotspot-hint {
  line-height: 1.4;
}

.hotspot-canvas-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 10px;
  background: #fafafa;
  padding: 6px;
  border: 1px dashed #b0bec5;
}

.hotspot-canvas {
  position: relative;
  display: inline-block;
  max-width: 100%;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.hotspot-image {
  display: block;
  max-width: 100%;
  height: auto;
  pointer-events: none;
  border-radius: 6px;
}

.hotspot-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(25, 118, 210, 0.85);
  border: 2.5px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s;
  animation: marker-pop 0.18s ease-out;
}

.hotspot-marker:hover {
  transform: translate(-50%, -50%) scale(1.12);
}

.hotspot-marker:active {
  transform: translate(-50%, -50%) scale(0.95);
}

.hotspot-marker-label {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

@keyframes marker-pop {
  from {
    transform: translate(-50%, -50%) scale(0.4);
    opacity: 0;
  }

  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.hotspot-footer {
  gap: 8px;
}

@media (max-width: 599px) {
  .hotspot-marker {
    width: 34px;
    height: 34px;
  }
}
</style>
