<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon name="rule" color="primary" class="q-mr-xs" />
        Pernyataan Benar / Salah
      </div>
      <div class="text-caption text-grey-7">
        Tentukan nilai kebenaran tiap pernyataan
      </div>
    </div>

    <q-list bordered separator class="rounded-borders bg-white" @dragover.prevent>
      <q-item v-for="(stmt, idx) in modelValue" :key="stmt.id" draggable="true" class="stmt-row q-py-sm" :class="{
        'stmt-row--dragging': dragIndex === idx,
        'stmt-row--drop-target': dropIndex === idx && dragIndex !== idx,
      }" @dragstart="onDragStart(idx)" @dragover.prevent="onDragOver(idx)" @dragleave="onDragLeave(idx)"
        @drop.prevent="onDrop(idx)" @dragend="onDragEnd">
        <!-- Handle + Number -->
        <q-item-section side style="min-width: 44px">
          <div class="row items-center no-wrap">
            <q-icon name="drag_indicator" color="grey-6" class="cursor-grab q-mr-xs" />
            <q-badge color="primary" :label="idx + 1" />
          </div>
        </q-item-section>

        <!-- Statement text -->
        <q-item-section>
          <q-input :model-value="stmt.text" placeholder="Tulis pernyataan yang bisa dinilai B/S..." outlined dense
            @update:model-value="(v) => onUpdateText(idx, v)" />
        </q-item-section>

        <!-- True/False toggle -->
        <q-item-section side style="min-width: 180px">
          <q-btn-toggle :model-value="stmt.correct" :options="[
            { label: 'BENAR', value: true, slot: 'true' },
            { label: 'SALAH', value: false, slot: 'false' },
          ]" no-caps unelevated toggle-color="positive" color="grey-3" text-color="grey-8"
            @update:model-value="(v) => onUpdateCorrect(idx, v)">
            <template v-slot:true>
              <q-icon name="check" size="xs" class="q-mr-xs" /> BENAR
            </template>
            <template v-slot:false>
              <q-icon name="close" size="xs" class="q-mr-xs" /> SALAH
            </template>
          </q-btn-toggle>
        </q-item-section>

        <!-- Remove -->
        <q-item-section side>
          <q-btn flat round dense icon="close" color="grey-6" :disable="modelValue.length <= 1"
            @click="onRemove(stmt.id)">
            <q-tooltip>Hapus pernyataan</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Add -->
    <div class="row q-gutter-sm q-mt-md items-center">
      <q-btn flat color="primary" icon="add" label="Tambahkan pernyataan" no-caps :disable="modelValue.length >= 10"
        @click="onAdd">
        <q-tooltip v-if="modelValue.length >= 10">Maksimal 10 pernyataan</q-tooltip>
      </q-btn>
      <span class="text-caption text-grey-7">
        {{ modelValue.length }} / 10 pernyataan
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

const createStatement = () => ({
  id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  text: '',
  correct: true,
})

const onUpdateText = (idx, value) => {
  const updated = props.modelValue.map((s, i) =>
    i === idx ? { ...s, text: value } : s,
  )
  emit('update:modelValue', updated)
}

const onUpdateCorrect = (idx, value) => {
  const updated = props.modelValue.map((s, i) =>
    i === idx ? { ...s, correct: value } : s,
  )
  emit('update:modelValue', updated)
}

const onAdd = () => {
  if (props.modelValue.length >= 10) return
  emit('update:modelValue', [...props.modelValue, createStatement()])
}

const onRemove = (id) => {
  if (props.modelValue.length <= 1) {
    $q.notify({ type: 'warning', message: 'Minimal 1 pernyataan' })
    return
  }
  emit('update:modelValue', props.modelValue.filter((s) => s.id !== id))
}

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
.stmt-row {
  transition: background-color 0.15s, border-color 0.15s;
  cursor: grab;
}

.stmt-row:active {
  cursor: grabbing;
}

.stmt-row--dragging {
  opacity: 0.4;
  background: #e3f2fd;
}

.stmt-row--drop-target {
  border-top: 2px solid #1976d2;
}

.cursor-grab {
  cursor: grab;
}
</style>
