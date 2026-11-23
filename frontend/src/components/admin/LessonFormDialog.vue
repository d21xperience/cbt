<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 600px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Pembelajaran' : 'Tambah Pembelajaran' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section class="q-gutter-md q-pt-md">
        <q-select v-model="localForm.teacher_id" :options="teacherOptions" label="Guru Pengampu" outlined dense
          emit-value map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Guru wajib dipilih']" />
        
        <q-select v-model="localForm.subject_id" :options="subjectOptions" label="Mata Pelajaran" outlined dense
          emit-value map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Mapel wajib dipilih']"
          @update:model-value="onSubjectChange" />

        <q-select v-model="localForm.class_ids" :options="availableClassOptions" label="Kelas (Bisa pilih lebih dari 1)"
          outlined dense emit-value map-options use-input use-chips multiple input-debounce="200"
          :disable="isEditing" hint="Kelas yang sudah diampu guru lain untuk mapel ini otomatis disembunyikan."
          :rules="[(v) => (v && v.length > 0) || 'Minimal 1 kelas wajib dipilih']" />

        <q-toggle v-model="localForm.is_exam_author" label="Tunjuk sebagai Penyusun Soal (Ujian)" color="primary" />
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
  subjectOptions: { type: Array, default: () => [] },
  classOptions: { type: Array, default: () => [] },
  teacherOptions: { type: Array, default: () => [] },
  semesterOptions: { type: Array, default: () => [] },
  lessons: { type: Array, default: () => [] }, // ✅ Tambahan: raw data untuk filter
})
const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = {
  subject_id: null,
  class_ids: [],
  teacher_id: null,
  is_exam_author: false,
  academic_year: '2025/2026',
  semester: 'GANJIL',
}

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
      if (!Array.isArray(localForm.class_ids)) {
        localForm.class_ids = localForm.class_ids ? [localForm.class_ids] : []
      }
      originalSnapshot.value = props.isEditing ? JSON.stringify({ ...localForm }) : null
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

// ✅ FITUR BARU: Filter kelas berdasarkan mapel yang dipilih
const availableClassOptions = computed(() => {
  if (!localForm.subject_id) return props.classOptions
  if (props.isEditing) return props.classOptions // Saat edit, biarkan semua opsi terbuka

  // Cari kelas mana saja yang sudah punya guru untuk mapel ini (di periode aktif)
  const usedClassIds = props.lessons
    .filter((l) => l.subject_id === localForm.subject_id)
    .map((l) => l.class_id)

  // Kembalikan kelas yang belum terpakai
  return props.classOptions.filter((c) => !usedClassIds.includes(c.value))
})

// Reset pilihan kelas jika mapel diubah
const onSubjectChange = () => {
  if (!props.isEditing) {
    localForm.class_ids = []
  }
}

const isDirty = computed(() => {
  if (!originalSnapshot.value) return true
  return JSON.stringify({ ...localForm }) !== originalSnapshot.value
})

const canSubmitInternal = computed(() => {
  if (!localForm.subject_id) return false
  if (!localForm.class_ids || localForm.class_ids.length === 0) return false
  if (!localForm.teacher_id) return false
  if (!localForm.academic_year?.trim()) return false
  if (!localForm.semester) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onSubmit = () => emit('submit', { ...localForm })
</script>
