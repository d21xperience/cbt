<template>
  <q-dialog v-model="isOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card>
      <q-bar class="bg-primary text-white">
        <div class="text-subtitle1">
          <q-icon name="auto_awesome" class="q-mr-xs" />
          Pilih / Buat Ujian
        </div>
        <q-space />
        <q-btn dense flat icon="close" @click="onClose" />
      </q-bar>

      <q-card-section>
        <q-inner-loading :showing="loadingRefs">
          <q-spinner color="primary" size="3em" />
          <div class="text-caption text-grey-7 q-mt-sm">Memuat data referensi...</div>
        </q-inner-loading>

        <q-stepper v-model="localStep" color="primary" animated flat>
          <!-- ═══ STEP 1: Tingkat ═══ -->
          <q-step :name="1" title="Tingkat" icon="stairs" :done="step > 1">
            <div class="text-subtitle2 q-mb-md">
              Pilih tingkat kelas untuk ujian ini:
            </div>
            <q-select v-model="localForm.tingkat" :options="tingkatOptions" label="Tingkat" outlined emit-value
              map-options :rules="[(v) => !!v || 'Tingkat wajib dipilih']" />
          </q-step>

          <!-- ═══ STEP 2: Jurusan (SMK/MAK only) ═══ -->
          <q-step :name="2" title="Jurusan" icon="engineering" :done="step > 2">
            <div class="text-subtitle2 q-mb-md">
              Pilih jurusan / program keahlian:
            </div>
            <q-select v-model="localForm.jurusan_id" :options="jurusanOptions" label="Jurusan" outlined emit-value
              map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Jurusan wajib dipilih']" />
          </q-step>

          <!-- ═══ STEP 3: Mapel ═══ -->
          <q-step :name="3" title="Mata Pelajaran" icon="menu_book" :done="step > 3">
            <div class="text-subtitle2 q-mb-md">
              Pilih mata pelajaran:
            </div>
            <q-select v-model="localForm.subject_id" :options="subjectOptions" label="Mata Pelajaran" outlined
              emit-value map-options use-input input-debounce="200" :rules="[(v) => !!v || 'Mapel wajib dipilih']" />
            <q-banner v-if="isProctorRole" dense rounded class="bg-blue-1 text-blue-9 q-mt-md">
              <template v-slot:avatar>
                <q-icon name="info" color="primary" />
              </template>
              Hanya menampilkan mapel yang Anda ampu.
            </q-banner>
          </q-step>

          <!-- ═══ STEP 4: Jenis Ujian + TA + Semester + Judul ═══ -->
          <q-step :name="4" title="Jenis & Judul" icon="label">
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-sm-6">
                <q-select v-model="localForm.jenis_ujian_id" :options="examTypeOptions" label="Jenis Ujian" outlined
                  dense emit-value map-options :rules="[(v) => !!v || 'Jenis ujian wajib']" />
              </div>
              <div class="col-12 col-sm-3">
                <q-input v-model="localForm.academic_year" label="Tahun Ajaran" outlined dense
                  :rules="[(v) => !!v || 'TA wajib']" />
              </div>
              <div class="col-12 col-sm-3">
                <q-select v-model="localForm.semester" :options="semesterOptions" label="Semester" outlined dense
                  emit-value map-options />
              </div>
            </div>

            <!-- Preview judul (editable) -->
            <q-banner class="bg-indigo-1 text-indigo-9 q-mb-md" rounded>
              <template v-slot:avatar>
                <q-icon name="auto_awesome" color="indigo" />
              </template>
              <div class="text-caption">Judul ujian yang akan dibuat:</div>
              <div class="text-h6 q-mt-xs text-weight-bold">
                {{ effectiveNama || '(lengkapi field di atas)' }}
              </div>
            </q-banner>

            <q-input v-model="localForm.custom_nama" label="Override Judul (opsional)" outlined dense
              :hint="generatedNama ? `Default: ${generatedNama}` : ''">
              <template v-slot:append>
                <q-btn v-if="localForm.custom_nama" flat round dense icon="clear" @click="resetCustomNama">
                  <q-tooltip>Reset ke judul auto</q-tooltip>
                </q-btn>
              </template>
            </q-input>
          </q-step>
        </q-stepper>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" color="grey-7" @click="onClose" />
        <q-btn v-if="step > 1" flat color="grey-7" icon="arrow_back" label="Kembali" @click="onPrev" />
        <q-btn v-if="step < 4" color="primary" icon-right="arrow_forward" label="Lanjut" :disable="!canNext"
          @click="onNext" />
        <q-btn v-if="step === 4" color="positive" icon="check_circle" label="Buat / Pilih Ujian" :loading="submitting"
          :disable="!canSubmit" @click="onSubmit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  step: { type: Number, default: 1 },
  submitting: Boolean,
  loadingRefs: Boolean,
  form: { type: Object, required: true },
  tingkatOptions: { type: Array, default: () => [] },
  jurusanOptions: { type: Array, default: () => [] },
  subjectOptions: { type: Array, default: () => [] },
  examTypeOptions: { type: Array, default: () => [] },
  semesterOptions: { type: Array, default: () => [] },
  isProctorRole: Boolean,
  generatedNama: { type: String, default: '' },
  effectiveNama: { type: String, default: '' },
  canNextStep1: Boolean,
  canNextStep2: Boolean,
  canNextStep3: Boolean,
  canSubmit: Boolean,
})

const emit = defineEmits([
  'update:modelValue',
  'update:step',
  'update:form',      // ← BARU
  'next-step',
  'prev-step',
  'reset-custom-nama',
  'submit',
  'close',
])

const EMPTY_FORM = {
  tingkat: '',
  jurusan_id: null,
  subject_id: null,
  jenis_ujian_id: null,
  academic_year: '2025/2026',
  semester: 'GANJIL',
  custom_nama: '',
}

const isOpen = ref(false)
const localStep = ref(1)
const localForm = reactive({ ...EMPTY_FORM })

// ── Sync dialog open + reset local form dari parent saat buka
watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) {
    Object.assign(localForm, EMPTY_FORM, props.form || {})
    localStep.value = props.step || 1
  }
})

// ── Emit form changes ke parent
watch(
  localForm,
  () => {
    emit('update:form', { ...localForm })
  },
  { deep: true },
)

// ── Sync step 2 arah
watch(isOpen, (val) => emit('update:modelValue', val))
watch(localStep, (val) => emit('update:step', val))
watch(() => props.step, (val) => {
  if (val !== localStep.value) localStep.value = val
})

const canNext = computed(() => {
  if (localStep.value === 1) return props.canNextStep1
  if (localStep.value === 2) return props.canNextStep2
  if (localStep.value === 3) return props.canNextStep3
  return true
})

const onNext = () => emit('next-step')
const onPrev = () => emit('prev-step')
const onClose = () => emit('close')
const onSubmit = () => emit('submit')
const resetCustomNama = () => {
  localForm.custom_nama = ''
  emit('reset-custom-nama')
}
</script>
