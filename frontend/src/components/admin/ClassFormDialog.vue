<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 600px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">
          {{ isEditing ? 'Edit Kelas' : 'Tambah Kelas' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <q-input v-model="localForm.nama" label="Nama Kelas / Rombel" outlined dense
          :rules="[(v) => !!v || 'Nama kelas wajib diisi']" hint="Contoh: 10 IPA 1, X TKJ A" />

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select v-model="localForm.tingkat" :options="tingkatOptions" label="Tingkat" outlined dense emit-value
              map-options :rules="[(v) => !!v || 'Tingkat wajib dipilih']" />
          </div>
          <div class="col-12 col-sm-6">
            <q-select v-model="localForm.kurikulum" :options="kurikulumOptions" label="Kurikulum" outlined dense
              emit-value map-options />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select v-model="localForm.jenis_rombel" :options="jenisRombelOptions" label="Jenis Rombel" outlined dense
              emit-value map-options />
          </div>
          <div v-if="showProgramKeahlian" class="col-12 col-sm-6">
            <q-input v-model="localForm.program_keahlian_id" label="Program Keahlian (opsional)" outlined dense
              hint="Khusus SMK/MAK" />
          </div>
        </div>

        <q-select v-model="localForm.wali_kelas_id" :options="teacherOptions" label="Wali Kelas (opsional)" outlined
          dense emit-value map-options clearable use-input input-debounce="200">
          <template v-slot:prepend>
            <q-icon name="person" />
          </template>
          <template v-slot:hint>
            Kosongkan jika belum ada wali kelas
          </template>
        </q-select>
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
  tingkatOptions: { type: Array, default: () => [] },
  kurikulumOptions: { type: Array, default: () => [] },
  jenisRombelOptions: { type: Array, default: () => [] },
  teacherOptions: { type: Array, default: () => [] },
  showProgramKeahlian: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = {
  nama: '',
  tingkat: '',
  kurikulum: 'K13',
  jenis_rombel: 'REGULER',
  program_keahlian_id: null,
  wali_kelas_id: null,
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
  if (!localForm.nama?.trim()) return false
  if (!localForm.tingkat) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onSubmit = () => emit('submit', { ...localForm })
</script>
