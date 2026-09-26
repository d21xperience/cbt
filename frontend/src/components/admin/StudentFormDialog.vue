<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 620px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Siswa' : 'Tambah Siswa' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="localForm.nisn" label="NISN" outlined dense :rules="[
              (v) => !!v || 'NISN wajib diisi',
              (v) => /^\d{10}$/.test(v) || 'NISN harus 10 digit',
            ]" mask="##########" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="localForm.nis" label="NIS (lokal, opsional)" outlined dense />
          </div>
        </div>

        <q-input v-model="localForm.nama" label="Nama Lengkap" outlined dense
          :rules="[(v) => !!v || 'Nama wajib diisi']" />

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-select v-model="localForm.jenis_kelamin" :options="genderOptions" label="Jenis Kelamin" outlined dense
              emit-value map-options />
          </div>
          <div class="col-12 col-sm-8">
            <q-input v-model="localForm.tanggal_lahir" type="date" label="Tanggal Lahir" outlined dense stack-label />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-8">
            <q-select v-model="localForm.kelas_id" :options="classOptions" label="Kelas" outlined dense emit-value
              map-options :rules="[(v) => !!v || 'Kelas wajib dipilih']" />
          </div>
          <div class="col-12 col-sm-4">
            <q-select v-model="localForm.status" :options="statusOptions" label="Status" outlined dense emit-value
              map-options />
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
  statusOptions: { type: Array, default: () => [] },
  genderOptions: { type: Array, default: () => [] },
  classOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = {
  nisn: '',
  nis: '',
  nama: '',
  jenis_kelamin: 'L',
  tanggal_lahir: '',
  kelas_id: null,
  status: 'AKTIF',
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
  if (!localForm.nisn?.trim()) return false
  if (!/^\d{10}$/.test(localForm.nisn)) return false
  if (!localForm.nama?.trim()) return false
  if (!localForm.kelas_id) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onSubmit = () => emit('submit', { ...localForm })
</script>
