<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon name="edit_note" color="primary" class="q-mr-xs" />
        Jawaban Diterima
      </div>
      <div class="text-caption text-grey-7">
        Siswa menjawab bebas · sistem cek ke daftar ini
      </div>
    </div>

    <!-- Accepted answers -->
    <q-list bordered separator class="rounded-borders bg-white">
      <q-item v-for="(ans, idx) in modelValue" :key="ans.id" class="q-py-sm">
        <q-item-section side style="min-width: 40px">
          <q-badge color="primary" :label="idx + 1" />
        </q-item-section>

        <q-item-section>
          <q-input :model-value="ans.text" placeholder="Jawaban diterima (mis. Jakarta)" outlined dense
            @update:model-value="(v) => onUpdate(idx, v)" />
        </q-item-section>

        <q-item-section side>
          <q-btn flat round dense icon="close" color="grey-6" :disable="modelValue.length <= 1"
            @click="onRemove(ans.id)">
            <q-tooltip>Hapus jawaban</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Add -->
    <div class="row q-gutter-sm q-mt-md items-center">
      <q-btn flat color="primary" icon="add" label="Tambah jawaban alternatif" no-caps
        :disable="modelValue.length >= 10" @click="onAdd" />
      <span class="text-caption text-grey-7">{{ modelValue.length }} / 10</span>
    </div>

    <!-- Options -->
    <q-card flat bordered class="q-mt-md bg-grey-1">
      <q-card-section>
        <div class="row items-center q-gutter-md">
          <q-toggle :model-value="caseSensitive" label="Case sensitive (bedakan huruf besar/kecil)"
            @update:model-value="$emit('update:caseSensitive', $event)" />
          <q-toggle :model-value="trimWhitespace" label="Trim spasi di awal/akhir"
            @update:model-value="$emit('update:trimWhitespace', $event)" />
        </div>
        <div class="text-caption text-grey-7 q-mt-sm">
          <q-icon name="info" size="xs" class="q-mr-xs" />
          Disarankan: case insensitive + trim aktif untuk keramahan siswa.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Array, required: true },
  caseSensitive: { type: Boolean, default: false },
  trimWhitespace: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'update:caseSensitive', 'update:trimWhitespace'])

const $q = useQuasar()

const createAnswer = () => ({
  id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  text: '',
})

const onUpdate = (idx, value) => {
  const updated = props.modelValue.map((a, i) =>
    i === idx ? { ...a, text: value } : a,
  )
  emit('update:modelValue', updated)
}

const onAdd = () => {
  if (props.modelValue.length >= 10) return
  emit('update:modelValue', [...props.modelValue, createAnswer()])
}

const onRemove = (id) => {
  if (props.modelValue.length <= 1) {
    $q.notify({ type: 'warning', message: 'Minimal 1 jawaban' })
    return
  }
  emit('update:modelValue', props.modelValue.filter((a) => a.id !== id))
}
</script>
