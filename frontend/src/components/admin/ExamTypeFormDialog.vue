<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 500px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Jenis Ujian' : 'Tambah Jenis Ujian' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <q-input v-model="localForm.kode" label="Kode" outlined dense :rules="[
          (v) => !!v || 'Kode wajib diisi',
          (v) => /^[A-Z0-9_-]+$/.test(v) || 'Hanya huruf besar, angka, - dan _',
        ]" hint="Contoh: UTS, UAS, UH, SUSULAN" @update:model-value="onKodeChange" />

        <q-input v-model="localForm.nama" label="Nama Jenis Ujian" outlined dense
          :rules="[(v) => !!v || 'Nama wajib diisi']" hint="Contoh: Ujian Tengah Semester" />

        <q-input v-model="localForm.deskripsi" label="Deskripsi (opsional)" type="textarea" outlined autogrow
          :rows="2" />
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn color="primary" :label="isEditing ? 'Simpan Perubahan' : 'Simpan'" :loading="submitting"
          :disable="!canSubmitInternal" @click="onSubmit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  isEditing: Boolean,
  initialForm: { type: Object, default: () => ({}) },
  submitting: Boolean,
})
const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = { kode: '', nama: '', deskripsi: '' }

const isOpen = ref(false)
const localForm = reactive({ ...EMPTY })
const originalSnapshot = ref(null)

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) {
      Object.keys(EMPTY).forEach((k) => {
        localForm[k] = props.initialForm?.[k] ?? EMPTY[k]
      })
      originalSnapshot.value = props.isEditing ? JSON.stringify({ ...localForm }) : null
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

// Auto-uppercase kode
const onKodeChange = (val) => {
  localForm.kode = String(val || '').toUpperCase()
}

const isDirty = computed(() => {
  if (!originalSnapshot.value) return true
  return JSON.stringify({ ...localForm }) !== originalSnapshot.value
})

const canSubmitInternal = computed(() => {
  if (!localForm.kode?.trim()) return false
  if (!/^[A-Z0-9_-]+$/.test(localForm.kode)) return false
  if (!localForm.nama?.trim()) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onSubmit = () => emit('submit', { ...localForm })
</script>
