<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon name="checklist" color="primary" class="q-mr-xs" />
        Opsi Jawaban
      </div>
      <div class="text-caption text-grey-7">
        Klik {{ multiCorrect ? 'checkbox (multi jawaban)' : 'radio' }} untuk menandai jawaban benar · Drag ⠿ untuk
        reorder
      </div>
      <div v-if="multiCorrect" class="text-caption text-primary q-ml-md">
        <q-icon name="info" size="xs" class="q-mr-xs" />
        <b>{{ correctCount }}</b> jawaban benar terpilih
      </div>
    </div>

    <q-list bordered separator class="rounded-borders bg-white" @dragover.prevent>
      <q-item v-for="(opt, idx) in modelValue" :key="opt.id" draggable="true" class="option-row q-py-sm" :class="{
        'option-row--dragging': dragIndex === idx,
        'option-row--drop-target': dropIndex === idx && dragIndex !== idx,
      }" @dragstart="onDragStart(idx)" @dragover.prevent="onDragOver(idx)" @dragleave="onDragLeave(idx)"
        @drop.prevent="onDrop(idx)" @dragend="onDragEnd">
        <!-- Drag handle -->
        <q-item-section side style="min-width: 24px">
          <q-icon name="drag_indicator" color="grey-6" class="cursor-grab" />
        </q-item-section>

        <!-- Radio (single) / Checkbox (multi) -->
        <q-item-section side style="min-width: 30px">
          <q-checkbox v-if="multiCorrect" :model-value="opt.is_correct" color="positive"
            @update:model-value="onSelectCorrect(opt.id)" />
          <q-radio v-else :model-value="opt.is_correct" :val="true" color="positive"
            @update:model-value="onSelectCorrect(opt.id)" />
        </q-item-section>

        <!-- Label + Text -->
        <q-item-section avatar style="min-width: 32px">
          <q-avatar size="28px" :color="opt.is_correct ? 'positive' : 'grey-4'"
            :text-color="opt.is_correct ? 'white' : 'grey-8'">
            {{ optionLabel(idx) }}
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <div class="row items-center q-gutter-xs no-wrap">
            <!-- Media preview (jika ada) -->
            <q-avatar v-if="opt.media_url" size="36px" class="q-mr-xs" square>
              <img :src="opt.media_url" />
            </q-avatar>

            <q-input :model-value="opt.text"
              :placeholder="opt.is_other ? 'Lainnya (jawaban custom user)' : `Opsi ${optionLabel(idx)}`" outlined dense
              class="col" :readonly="opt.is_other" :bg-color="opt.is_other ? 'blue-1' : 'white'"
              @update:model-value="(v) => onUpdateText(opt.id, v)" />
          </div>
        </q-item-section>

        <!-- Media button -->
        <q-item-section side>
          <q-btn flat round dense :icon="opt.media_url ? 'image' : 'image_outlined'"
            :color="opt.media_url ? 'primary' : 'grey-6'" @click="$emit('media', opt)">
            <q-tooltip>{{ opt.media_url ? 'Ganti gambar' : 'Tambah gambar' }}</q-tooltip>
          </q-btn>
        </q-item-section>

        <!-- Remove -->
        <q-item-section side>
          <q-btn flat round dense icon="close" color="grey-6" :disable="modelValue.length <= 2"
            @click="onRemove(opt.id)">
            <q-tooltip>Hapus opsi</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Actions -->
    <div class="row q-gutter-sm q-mt-md items-center">
      <q-btn flat color="primary" icon="add" label="Tambahkan opsi" no-caps @click="onAdd" />
      <span class="text-caption text-grey-7">atau</span>
      <q-btn flat color="primary" icon="add_link" label="tambahkan &quot;Lainnya&quot;" no-caps
        :disable="hasOtherOption" @click="onAddOther">
        <q-tooltip v-if="hasOtherOption">
          Opsi "Lainnya" sudah ada
        </q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDynamicOptions } from '@/composables/admin/useDynamicOptions'

const props = defineProps({
  modelValue: { type: Array, required: true },
  multiCorrect: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'media'])

const $q = useQuasar()
const { createOption, createOtherOption, optionLabel, setSingleCorrect, toggleCorrect } = useDynamicOptions()

// ── Drag state
const dragIndex = ref(null)
const dropIndex = ref(null)

const hasOtherOption = computed(() => props.modelValue.some((o) => o.is_other))

// ── Text / correct
const onUpdateText = (id, text) => {
  const updated = props.modelValue.map((o) => (o.id === id ? { ...o, text } : o))
  emit('update:modelValue', updated)
}
const correctCount = computed(() =>
  props.modelValue.filter((o) => o.is_correct).length,
)
const onSelectCorrect = (id) => {
  if (props.multiCorrect) {
    emit('update:modelValue', toggleCorrect(props.modelValue, id))
  } else {
    const updated = props.modelValue.map((o) => ({ ...o }))
    setSingleCorrect(updated, id)
    emit('update:modelValue', updated)
  }
}

// ── Add / remove
const onAdd = () => {
  const updated = [...props.modelValue]
  // Insert "new" SEBELUM opsi "Lainnya" kalau ada
  const otherIdx = updated.findIndex((o) => o.is_other)
  const newOpt = createOption('')
  if (otherIdx === -1) {
    updated.push(newOpt)
  } else {
    updated.splice(otherIdx, 0, newOpt)
  }
  emit('update:modelValue', updated)
}

const onAddOther = () => {
  if (hasOtherOption.value) return
  const updated = [...props.modelValue, createOtherOption()]
  emit('update:modelValue', updated)
}

const onRemove = (id) => {
  if (props.modelValue.length <= 2) {
    $q.notify({ type: 'warning', message: 'Minimal 2 opsi' })
    return
  }
  const wasCorrect = props.modelValue.find((o) => o.id === id)?.is_correct
  const updated = props.modelValue.filter((o) => o.id !== id)
  // Kalau yang dihapus adalah yang benar, set first sebagai benar
  if (wasCorrect && updated.length > 0) {
    updated.forEach((o, i) => { o.is_correct = i === 0 })
  }
  emit('update:modelValue', updated)
}

// ── Drag & drop
const onDragStart = (idx) => {
  dragIndex.value = idx
}

const onDragOver = (idx) => {
  dropIndex.value = idx
}

const onDragLeave = (idx) => {
  if (dropIndex.value === idx) dropIndex.value = null
}

const onDrop = (targetIdx) => {
  const from = dragIndex.value
  if (from === null || from === targetIdx) {
    onDragEnd()
    return
  }
  const updated = [...props.modelValue]
  const [moved] = updated.splice(from, 1)
  updated.splice(targetIdx, 0, moved)
  emit('update:modelValue', updated)
  onDragEnd()
}

const onDragEnd = () => {
  dragIndex.value = null
  dropIndex.value = null
}
</script>

<style scoped>
.option-row {
  transition: background-color 0.15s, border-color 0.15s;
  cursor: grab;
}

.option-row:active {
  cursor: grabbing;
}

.option-row--dragging {
  opacity: 0.4;
  background: #e3f2fd;
}

.option-row--drop-target {
  border-top: 2px solid #1976d2;
}

.cursor-grab {
  cursor: grab;
}
</style>
