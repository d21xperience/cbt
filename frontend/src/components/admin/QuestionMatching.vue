<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon name="compare_arrows" color="primary" class="q-mr-xs" />
        Pasangan Menjodohkan
      </div>
      <div class="text-caption text-grey-7">
        Kiri = premis · Kanan = jawaban pasangan
      </div>
    </div>

    <!-- Header row -->
    <div class="row q-col-gutter-sm q-mb-xs text-caption text-weight-bold text-grey-7 text-uppercase">
      <div style="width: 32px" />
      <div class="col-5">Premis (kiri)</div>
      <div class="col-5">Jawaban Pasangan (kanan)</div>
      <div style="width: 80px" />
    </div>

    <q-list bordered separator class="rounded-borders bg-white" @dragover.prevent>
      <q-item v-for="(pair, idx) in modelValue" :key="pair.id" draggable="true" class="pair-row q-py-sm" :class="{
        'pair-row--dragging': dragIndex === idx,
        'pair-row--drop-target': dropIndex === idx && dragIndex !== idx,
      }" @dragstart="onDragStart(idx)" @dragover.prevent="onDragOver(idx)" @dragleave="onDragLeave(idx)"
        @drop.prevent="onDrop(idx)" @dragend="onDragEnd">
        <!-- Handle + Number -->
        <q-item-section side style="min-width: 44px">
          <div class="row items-center no-wrap">
            <q-icon name="drag_indicator" color="grey-6" class="cursor-grab q-mr-xs" />
            <q-badge color="primary" :label="idx + 1" />
          </div>
        </q-item-section>

        <!-- Left (premis) -->
        <q-item-section>
          <q-input :model-value="pair.left" placeholder="Contoh: Ibukota Indonesia" outlined dense
            @update:model-value="(v) => onUpdate(idx, 'left', v)" />
        </q-item-section>

        <!-- Arrow -->
        <q-item-section side style="min-width: 32px">
          <q-icon name="arrow_forward" color="grey-5" />
        </q-item-section>

        <!-- Right (jawaban) -->
        <q-item-section>
          <q-input :model-value="pair.right" placeholder="Contoh: Jakarta" outlined dense
            @update:model-value="(v) => onUpdate(idx, 'right', v)" />
        </q-item-section>

        <!-- Remove -->
        <q-item-section side>
          <q-btn flat round dense icon="close" color="grey-6" :disable="modelValue.length <= 2"
            @click="onRemove(pair.id)">
            <q-tooltip>Hapus pasangan</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Add -->
    <div class="row q-gutter-sm q-mt-md items-center">
      <q-btn flat color="primary" icon="add" label="Tambahkan pasangan" no-caps :disable="modelValue.length >= 10"
        @click="onAdd">
        <q-tooltip v-if="modelValue.length >= 10">Maksimal 10 pasangan</q-tooltip>
      </q-btn>
      <span class="text-caption text-grey-7">
        {{ modelValue.length }} / 10 pasangan
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const dragIndex = ref(null)
const dropIndex = ref(null)

const createPair = () => ({
  id: `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  left: '',
  right: '',
})

const onUpdate = (idx, field, value) => {
  const updated = props.modelValue.map((p, i) =>
    i === idx ? { ...p, [field]: value } : p,
  )
  emit('update:modelValue', updated)
}

const onAdd = () => {
  if (props.modelValue.length >= 10) return
  emit('update:modelValue', [...props.modelValue, createPair()])
}

const onRemove = (id) => {
  if (props.modelValue.length <= 2) {
    $q.notify({ type: 'warning', message: 'Minimal 2 pasangan' })
    return
  }
  emit('update:modelValue', props.modelValue.filter((p) => p.id !== id))
}

// ── Drag
const onDragStart = (idx) => { dragIndex.value = idx }
const onDragOver = (idx) => { dropIndex.value = idx }
const onDragLeave = (idx) => { if (dropIndex.value === idx) dropIndex.value = null }
const onDrop = (targetIdx) => {
  const from = dragIndex.value
  if (from === null || from === targetIdx) { onDragEnd(); return }
  const updated = [...props.modelValue]
  const [moved] = updated.splice(from, 1)
  updated.splice(targetIdx, 0, moved)
  emit('update:modelValue', updated)
  onDragEnd()
}
const onDragEnd = () => { dragIndex.value = null; dropIndex.value = null }
</script>

<style scoped>
.pair-row {
  transition: background-color 0.15s, border-color 0.15s;
  cursor: grab;
}

.pair-row:active {
  cursor: grabbing;
}

.pair-row--dragging {
  opacity: 0.4;
  background: #e3f2fd;
}

.pair-row--drop-target {
  border-top: 2px solid #1976d2;
}

.cursor-grab {
  cursor: grab;
}
</style>
