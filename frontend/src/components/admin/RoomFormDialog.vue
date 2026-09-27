<!-- src/components/admin/RoomFormDialog.vue -->
<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 420px; max-width: 560px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEditing ? 'Edit Ruang' : 'Tambah Ruang' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input v-model="localForm.nama" label="Nama Ruang *" outlined dense hint="Mis. R01, LAB-TKJ-01"
          :rules="[(v) => !!v || 'Nama wajib diisi']" />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-7">
            <q-select v-model="localForm.gedung" :options="gedungOptions" label="Gedung" outlined dense emit-value
              map-options use-input input-debounce="0" new-value-mode="add-unique"
              hint="Pilih atau ketik gedung baru" />
          </div>
          <div class="col-12 col-md-5">
            <q-input v-model.number="localForm.lantai" type="number" label="Lantai" outlined dense min="1" />
          </div>
        </div>

        <q-input v-model.number="localForm.kapasitas" type="number" label="Kapasitas (orang)" outlined dense min="0" />

        <q-input v-model="localForm.keterangan" label="Keterangan" outlined dense type="textarea" rows="2" />

        <q-toggle v-model="localForm.aktif" label="Ruang aktif digunakan" color="primary" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn color="primary" :label="isEditing ? 'Simpan' : 'Buat'" :loading="submitting" @click="onSubmit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  initialForm: { type: Object, default: () => ({}) },
  submitting: { type: Boolean, default: false },
  gedungOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const localForm = ref({
  nama: '',
  gedung: '',
  lantai: 1,
  kapasitas: 0,
  keterangan: '',
  aktif: true,
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      localForm.value = {
        nama: '',
        gedung: '',
        lantai: 1,
        kapasitas: 0,
        keterangan: '',
        aktif: true,
        ...props.initialForm,
      }
    }
  },
  { immediate: true },
)

const onSubmit = () => {
  if (!localForm.value.nama) return
  emit('submit', { ...localForm.value })
}
</script>
