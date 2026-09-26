<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold col">
        <q-icon name="code" color="primary" class="q-mr-xs" />
        Coding — Kode &amp; Test Cases
      </div>
      <div class="text-caption text-grey-7">
        Siswa menulis kode · sistem uji pakai test cases
      </div>
    </div>

    <!-- Language -->
    <q-select :model-value="language" :options="languageOptions" label="Bahasa Pemrograman" outlined dense emit-value
      map-options class="q-mb-md" style="max-width: 240px" @update:model-value="$emit('update:language', $event)" />

    <!-- Starter code -->
    <div class="q-mb-md">
      <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
        Starter Code (template yang dilihat siswa)
      </div>
      <q-input :model-value="starterCode" type="textarea" outlined autogrow :rows="6" class="code-input"
        placeholder="// Kode awal untuk siswa..." @update:model-value="$emit('update:starterCode', $event)" />
    </div>

    <!-- Test cases -->
    <div class="row items-center q-mb-sm">
      <div class="text-caption text-weight-bold text-grey-7 col text-uppercase">
        Test Cases ({{ modelValue.length }})
      </div>
    </div>

    <q-list bordered separator class="rounded-borders bg-white">
      <q-item v-for="(tc, idx) in modelValue" :key="tc.id" class="q-py-sm">
        <q-item-section side style="min-width: 32px">
          <q-badge color="primary" :label="idx + 1" />
        </q-item-section>

        <q-item-section>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input :model-value="tc.input" label="Input" outlined dense
                @update:model-value="(v) => onUpdate(idx, 'input', v)" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input :model-value="tc.expected_output" label="Output yang Diharapkan" outlined dense
                @update:model-value="(v) => onUpdate(idx, 'expected_output', v)" />
            </div>
          </div>
        </q-item-section>

        <q-item-section side style="min-width: 110px">
          <q-toggle :model-value="tc.is_hidden" label="Hidden" dense color="orange"
            @update:model-value="(v) => onUpdate(idx, 'is_hidden', v)">
            <q-tooltip>Hidden test case tidak ditampilkan ke siswa</q-tooltip>
          </q-toggle>
        </q-item-section>

        <q-item-section side>
          <q-btn flat round dense icon="close" color="grey-6" :disable="modelValue.length <= 1"
            @click="onRemove(tc.id)">
            <q-tooltip>Hapus test case</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>

      <q-item v-if="modelValue.length === 0" class="text-center text-grey-6 q-pa-md">
        Belum ada test case
      </q-item>
    </q-list>

    <div class="row q-gutter-sm q-mt-md items-center">
      <q-btn flat color="primary" icon="add" label="Tambah test case" no-caps :disable="modelValue.length >= 15"
        @click="onAdd" />
      <span class="text-caption text-grey-7">{{ modelValue.length }} / 15</span>
    </div>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Array, required: true },
  language: { type: String, default: 'javascript' },
  starterCode: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'update:language', 'update:starterCode'])

const $q = useQuasar()

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Go', value: 'go' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
  { label: 'PHP', value: 'php' },
  { label: 'SQL', value: 'sql' },
  { label: 'Pseudo-code', value: 'pseudo' },
]

const createTestCase = () => ({
  id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  input: '',
  expected_output: '',
  is_hidden: false,
})

const onUpdate = (idx, field, value) => {
  const updated = props.modelValue.map((t, i) =>
    i === idx ? { ...t, [field]: value } : t,
  )
  emit('update:modelValue', updated)
}

const onAdd = () => {
  if (props.modelValue.length >= 15) return
  emit('update:modelValue', [...props.modelValue, createTestCase()])
}

const onRemove = (id) => {
  if (props.modelValue.length <= 1) {
    $q.notify({ type: 'warning', message: 'Minimal 1 test case' })
    return
  }
  emit('update:modelValue', props.modelValue.filter((t) => t.id !== id))
}
</script>

<style scoped>
.code-input :deep(textarea) {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
