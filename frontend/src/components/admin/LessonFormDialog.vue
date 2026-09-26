<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 600px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Pembelajaran' : 'Tambah Pembelajaran' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <q-select v-model="localForm.subject_id" :options="subjectOptions" label="Mata Pelajaran" outlined dense
          emit-value map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Mapel wajib dipilih']" />

        <q-select v-model="localForm.class_id" :options="classOptions" label="Kelas" outlined dense emit-value
          map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Kelas wajib dipilih']" />

        <q-select v-model="localForm.teacher_id" :options="teacherOptions" label="Guru Pengampu" outlined dense
          emit-value map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Guru wajib dipilih']" />

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="localForm.academic_year" label="Tahun Ajaran" outlined dense
              :rules="[(v) => !!v || 'Tahun ajaran wajib']" hint="Format: 2025/2026" />
          </div>
          <div class="col-12 col-sm-6">
            <q-select v-model="localForm.semester" :options="semesterOptions" label="Semester" outlined dense emit-value
              map-options :rules="[(v) => !!v || 'Semester wajib']" />
          </div>
        </div>
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
})
const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = {
  subject_id: null,
  class_id: null,
  teacher_id: null,
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
      originalSnapshot.value = props.isEditing ? JSON.stringify({ ...localForm }) : null
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

const isDirty = computed(() => {
  if (!originalSnapshot.value) return true
  return JSON.stringify({ ...localForm }) !== originalSnapshot.value
})

const canSubmitInternal = computed(() => {
  if (!localForm.subject_id) return false
  if (!localForm.class_id) return false
  if (!localForm.teacher_id) return false
  if (!localForm.academic_year?.trim()) return false
  if (!localForm.semester) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onSubmit = () => emit('submit', { ...localForm })
</script>
