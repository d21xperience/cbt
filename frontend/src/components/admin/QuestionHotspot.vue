<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon name="touch_app" color="primary" class="q-mr-xs" />
        Hotspot — Area Klik
      </div>
      <div class="text-caption text-grey-7">
        Klik gambar untuk menambah marker · tandai benar/salah
      </div>
    </div>

    <!-- Upload image -->
    <q-card flat bordered class="bg-white q-mb-md">
      <q-card-section>
        <q-input :model-value="imageUrl" label="URL Gambar" outlined dense
          hint="Upload base64 (max 1 MB) atau masukkan URL" @update:model-value="$emit('update:imageUrl', $event)">
          <template v-slot:prepend>
            <q-icon name="image" />
          </template>
          <template v-slot:append>
            <q-btn flat round dense icon="upload_file" color="primary" @click="pickFile">
              <q-tooltip>Upload gambar</q-tooltip>
            </q-btn>
            <q-btn v-if="imageUrl" flat round dense icon="clear" color="grey-6" @click="$emit('update:imageUrl', '')">
              <q-tooltip>Clear</q-tooltip>
            </q-btn>
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- Canvas (image + markers) -->
    <div v-if="imageUrl" class="hotspot-canvas">
      <div ref="canvasRef" class="hotspot-image-wrap" @click="onCanvasClick">
        <img :src="imageUrl" class="hotspot-image" />

        <!-- Markers -->
        <div v-for="(m, idx) in modelValue" :key="m.id" class="hotspot-marker"
          :class="m.is_correct ? 'hotspot-marker--correct' : 'hotspot-marker--wrong'" :style="{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: `${m.radius * 2}%`,
            height: `${m.radius * 2}%`,
          }" @click.stop="onMarkerClick(m.id)">
          <div class="hotspot-marker-label">{{ m.label || idx + 1 }}</div>
        </div>
      </div>

      <div class="text-caption text-grey-7 q-mt-sm text-center">
        <q-icon name="info" size="xs" class="q-mr-xs" />
        Klik gambar untuk menambah marker · klik marker untuk toggle benar/salah
      </div>
    </div>

    <div v-else class="hotspot-empty">
      <q-icon name="image" size="48px" color="grey-4" />
      <div class="text-caption text-grey-6 q-mt-sm">Belum ada gambar</div>
    </div>

    <!-- Hotspot list -->
    <div v-if="modelValue.length > 0" class="q-mt-md">
      <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
        Marker ({{ modelValue.length }}) · {{ correctCount }} benar
      </div>
      <q-list bordered separator class="rounded-borders bg-white">
        <q-item v-for="(m, idx) in modelValue" :key="m.id" class="q-py-sm">
          <q-item-section side>
            <q-badge :color="m.is_correct ? 'positive' : 'negative'" :label="idx + 1" />
          </q-item-section>
          <q-item-section>
            <q-input :model-value="m.label" placeholder="Label (mis. Jantung)" outlined dense
              @update:model-value="(v) => onUpdateLabel(m.id, v)" />
          </q-item-section>
          <q-item-section side style="min-width: 130px">
            <q-btn-toggle :model-value="m.is_correct" :options="[
              { label: 'BENAR', value: true },
              { label: 'SALAH', value: false },
            ]" no-caps dense unelevated toggle-color="positive" color="grey-3" text-color="grey-8"
              @update:model-value="(v) => onSetCorrect(m.id, v)" />
          </q-item-section>
          <q-item-section side>
            <q-btn flat round dense icon="close" color="grey-6" @click="onRemove(m.id)">
              <q-tooltip>Hapus marker</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Array, required: true },
  imageUrl: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'update:imageUrl'])

const $q = useQuasar()
const fileInput = ref(null)
const canvasRef = ref(null)

const MAX_SIZE = 1 * 1024 * 1024
const DEFAULT_RADIUS = 4 // persen

const correctCount = computed(() =>
  props.modelValue.filter((m) => m.is_correct).length,
)

const pickFile = () => fileInput.value?.click()

const onFileSelected = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_SIZE) {
    $q.notify({ type: 'negative', message: 'Ukuran gambar max 1 MB.' })
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => emit('update:imageUrl', reader.result)
  reader.readAsDataURL(file)
  e.target.value = ''
}

const onCanvasClick = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100

  const newMarker = {
    id: `hs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    radius: DEFAULT_RADIUS,
    is_correct: false,
    label: '',
  }
  emit('update:modelValue', [...props.modelValue, newMarker])
}

const onMarkerClick = (id) => {
  // Toggle correct
  const updated = props.modelValue.map((m) =>
    m.id === id ? { ...m, is_correct: !m.is_correct } : m,
  )
  emit('update:modelValue', updated)
}

const onUpdateLabel = (id, label) => {
  const updated = props.modelValue.map((m) =>
    m.id === id ? { ...m, label } : m,
  )
  emit('update:modelValue', updated)
}

const onSetCorrect = (id, value) => {
  const updated = props.modelValue.map((m) =>
    m.id === id ? { ...m, is_correct: value } : m,
  )
  emit('update:modelValue', updated)
}

const onRemove = (id) => {
  emit('update:modelValue', props.modelValue.filter((m) => m.id !== id))
}
</script>

<style scoped>
.hotspot-canvas {
  user-select: none;
}

.hotspot-image-wrap {
  position: relative;
  display: inline-block;
  max-width: 100%;
  cursor: crosshair;
  border: 2px dashed #90caf9;
  border-radius: 6px;
  overflow: hidden;
}

.hotspot-image {
  display: block;
  max-width: 100%;
  max-height: 480px;
  pointer-events: none;
}

.hotspot-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 24px;
  min-height: 24px;
}

.hotspot-marker--correct {
  background: rgba(76, 175, 80, 0.35);
  border-color: #2e7d32;
}

.hotspot-marker--wrong {
  background: rgba(244, 67, 54, 0.35);
  border-color: #c62828;
}

.hotspot-marker:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.hotspot-marker-label {
  font-size: 10px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  padding: 0 4px;
  white-space: nowrap;
}

.hotspot-empty {
  padding: 32px;
  text-align: center;
  background: #fafafa;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
}
</style>
