<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 600px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <!-- Banner Mode Ujian Aktif -->
        <q-banner dense rounded class="bg-blue-1 text-blue-9">
          <template v-slot:avatar><q-icon name="assignment" color="primary" /></template>
          Mode Ujian Aktif: <b>{{ academicStore.exam_mode || 'Belum Dipilih' }}</b>
        </q-banner>
        <div class="row q-col-gutter-x-sm">
          <div class="col-12">
            <q-select
              v-model="form.lesson_id"
              :options="lessonOptions"
              label="Pembelajaran (Mapel - Kelas - Guru)"
              outlined
              dense
              emit-value
              map-options
              use-input
              input-debounce="200"
              :disable="isEditing"
            />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="form.tanggal" type="date" label="Tanggal" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="form.jam_mulai" type="time" label="Jam Mulai" outlined dense />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="form.durasi_menit"
              type="number"
              label="Durasi (menit)"
              outlined
              dense
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.status"
              :options="[
                { label: 'DRAFT', value: 'DRAFT' },
                { label: 'PUBLISHED', value: 'PUBLISHED' },
              ]"
              label="Status"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.pengawas1_id"
              :options="teacherOptions"
              label="Pengawas 1 (Opsional)"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.pengawas2_id"
              :options="teacherOptions"
              label="Pengawas 2 (Opsional)"
              outlined
              dense
              emit-value
              map-options
              clearable
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn
          color="primary"
          label="Simpan"
          :loading="submitting"
          @click="onSubmit"
          :disable="!academicStore.exam_mode"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { useAcademicStore } from '@/stores/academic'

const props = defineProps({
  modelValue: Boolean,
  isEditing: Boolean,
  initialForm: { type: Object, default: () => ({}) },
  submitting: Boolean,
  lessonOptions: { type: Array, default: () => [] },
  teacherOptions: { type: Array, default: () => [] },
  roomOptions: { type: Array, default: () => [] },
})

const academicStore = useAcademicStore()
const emit = defineEmits(['update:modelValue', 'submit'])
const isOpen = ref(false)
const form = reactive({})

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) {
      Object.keys(form).forEach((k) => delete form[k])
      Object.assign(form, props.initialForm)
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

const onSubmit = () => emit('submit', { ...form })
</script>
