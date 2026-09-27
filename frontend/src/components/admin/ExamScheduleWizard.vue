<!-- src/components/admin/ExamScheduleWizard.vue -->
<template>
  <q-card flat bordered class="bg-white">
    <q-card-section class="row items-center">
      <div>
        <div class="text-subtitle1 text-weight-bold">{{ stepTitle }}</div>
        <div class="text-caption text-grey-7">{{ stepSubtitle }}</div>
      </div>
      <q-space />
      <q-btn flat round dense icon="close" color="grey-7" @click="onCancel">
        <q-tooltip>Batal</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pb-none">
      <q-stepper v-model="step" flat animated color="primary" header-nav>
        <q-step :name="1" title="Konteks" icon="settings" :done="step > 1" />
        <q-step :name="2" title="Mapel Wajib" icon="menu_book" :done="step > 2" />
        <q-step v-if="hasMajor(props.jenjang)" :name="3" title="Mapel Kejuruan" icon="construction" :done="step > 3" />
        <q-step :name="4" title="Pengawas" icon="person_pin" :done="false" />
      </q-stepper>
    </q-card-section>

    <!-- STEP 1 -->
    <q-card-section v-if="step === 1" class="q-gutter-md">
      <q-select v-model="context.jenis_ujian_id" :options="examTypeOptions" label="Jenis Ujian" outlined dense
        emit-value map-options />
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-select v-model="context.academic_year" :options="academicYearOptions" label="Tahun Ajaran" outlined dense
            emit-value map-options />
        </div>
        <div class="col-12 col-sm-6">
          <q-select v-model="context.semester" :options="semesterOptions" label="Semester" outlined dense emit-value
            map-options />
        </div>
      </div>

      <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mt-md">
        <template #avatar><q-icon name="info" color="primary" /></template>
        Semua tingkat kelas akan ditampilkan di langkah berikutnya.
      </q-banner>

      <div class="row justify-end q-mt-lg">
        <q-btn color="primary" label="Lanjut" icon-right="arrow_forward" @click="goStep2" />
      </div>
    </q-card-section>

    <!-- STEP 2: WAJIB -->
    <q-card-section v-if="step === 2">
      <div v-for="(group, tingkat) in groupedWajibByTingkat" :key="tingkat" class="q-mb-lg">
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle2 text-weight-bold text-primary">
            <q-icon name="class" class="q-mr-xs" />Tingkat {{ tingkat }}
          </div>
          <q-space />
          <q-btn flat dense size="sm" color="primary" icon="content_copy" label="Isi Semua Sama"
            @click="openFillAll('tingkat', tingkat)" />
        </div>

        <SubjectTable :rows="group" :get-end-time="getEndTime" />
      </div>

      <div v-if="wajibRows.length === 0" class="text-center text-grey-7 q-pa-lg">
        <q-icon name="event_busy" size="3rem" />
        <div class="q-mt-md">Tidak ada mata pelajaran WAJIB untuk jenjang ini.</div>
      </div>

      <div class="row justify-between q-mt-lg">
        <q-btn flat label="Kembali" color="grey-7" icon="arrow_back" @click="step = 1" />
        <q-btn color="primary" label="Lanjut" icon-right="arrow_forward" @click="goStep3or4" />
      </div>
    </q-card-section>

    <!-- STEP 3: KEJURUAN -->
    <q-card-section v-if="step === 3">
      <div v-for="(tingkatGroup, tingkat) in groupedKejuruanByTingkat" :key="tingkat" class="q-mb-xl">
        <!-- Header Tingkat -->
        <div class="text-subtitle2 text-weight-bold text-primary q-mb-md">
          <q-icon name="class" class="q-mr-xs" />Tingkat {{ tingkat }}
        </div>

        <!-- Sub-group per Jurusan -->
        <div v-for="(jGroup, jid) in tingkatGroup" :key="jid" class="q-mb-lg q-ml-md">
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 text-weight-bold text-deep-purple">
              <q-icon name="engineering" class="q-mr-xs" />{{ jGroup.nama }}
            </div>
            <q-space />
            <q-btn flat dense size="sm" color="deep-purple" icon="content_copy" label="Isi Semua Sama"
              @click="openFillAll('jurusan-tingkat', { jurusan_id: jid, tingkat })" />
          </div>

          <SubjectTable :rows="jGroup.rows" :get-end-time="getEndTime" />
        </div>
      </div>

      <div v-if="kejuruanRows.length === 0" class="text-center text-grey-7 q-pa-lg">
        <q-icon name="info" size="3rem" />
        <div class="q-mt-md">Belum ada mata pelajaran kejuruan untuk sekolah ini.</div>
      </div>

      <div class="row justify-between q-mt-lg">
        <q-btn flat label="Kembali" color="grey-7" icon="arrow_back" @click="step = 2" />
        <q-btn color="primary" label="Lanjut ke Pengawas" icon-right="arrow_forward" @click="goStep4" />
      </div>
    </q-card-section>

    <!-- STEP 4: ASSIGN -->
    <q-card-section v-if="step === 4">
      <ExamScheduleAssignStep :rows="assignRows" :teachers="teachers" :teacher-options="teacherOptions"
        :ruang-options-all="ruangOptionsAll" :get-end-time="getEndTime" @auto-one="assignAutoPerRow"
        @auto-all="assignAutoAll" />

      <div class="row justify-between q-mt-lg">
        <q-btn flat label="Kembali" color="grey-7" icon="arrow_back" @click="backFromStep4" />
        <q-btn color="primary" label="Simpan Semua Jadwal" icon="save" :loading="saving"
          :disable="assignRows.length === 0" @click="onSave" />
      </div>
    </q-card-section>

    <!-- Fill All Dialog -->
    <q-dialog v-model="fillAllOpen">
      <q-card style="min-width: 380px">
        <q-card-section class="text-h6">
          Isi Semua Mapel {{ fillAllLabel }}
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="fillAllForm.tanggal" type="date" label="Tanggal" outlined dense />
          <q-input v-model="fillAllForm.jam_mulai" type="time" label="Jam Mulai" outlined dense />
          <q-input v-model.number="fillAllForm.durasi_menit" type="number" label="Durasi (menit)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Terapkan" @click="applyFillAll" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useExamScheduleWizard } from '@/composables/admin/useExamScheduleWizard'
import SubjectTable from './ExamScheduleSubjectTable.vue'
import ExamScheduleAssignStep from './ExamScheduleAssignStep.vue'

const props = defineProps({
  jenjang: { type: String, default: '' },
  durationYears: { type: Number, default: 3 },
})

const emit = defineEmits(['cancel', 'saved'])

const step = ref(1)
const fillAllOpen = ref(false)
const fillAllScope = ref({ type: 'tingkat', key: null })
const fillAllLabel = ref('')
const fillAllForm = ref({ tanggal: '', jam_mulai: '', durasi_menit: 90 })

const {
  context,
  assignRows,
  teachers,               // ← TAMBAH
  examTypeOptions,
  semesterOptions,
  academicYearOptions,
  teacherOptions,
  ruangOptionsAll,
  saving,
  wajibRows,
  kejuruanRows,
  groupedWajibByTingkat,
  groupedKejuruanByTingkat,
  hasMajor,
  buildSubjectRows,
  fillAllForTingkat,
  fillAllForJurusan,
  getEndTime,
  buildAssignRows,
  assignAutoPerRow,
  assignAutoAll,
  save,
} = useExamScheduleWizard()

const stepTitle = computed(() => {
  if (step.value === 1) return 'Langkah 1: Konteks Ujian'
  if (step.value === 2) return 'Langkah 2: Jadwal Mapel Wajib'
  if (step.value === 3) return 'Langkah 3: Jadwal Mapel Kejuruan'
  return 'Langkah 4: Distribusi Kelas & Pengawas'
})

const stepSubtitle = computed(() => {
  if (step.value === 1) return 'Tentukan jenis ujian, tahun ajaran, dan semester.'
  if (step.value === 2) return 'Isi tanggal & jam untuk mapel wajib semua tingkat.'
  if (step.value === 3) return 'Isi tanggal & jam untuk mapel kejuruan per jurusan.'
  return 'Assign ruang dan pengawas untuk setiap kelas peserta.'
})

const goStep2 = () => {
  buildSubjectRows(props.jenjang, props.durationYears)
  step.value = 2
}

const goStep3or4 = () => {
  if (hasMajor(props.jenjang)) step.value = 3
  else goStep4()
}

const goStep4 = () => {
  buildAssignRows()
  step.value = 4
}

const backFromStep4 = () => {
  step.value = hasMajor(props.jenjang) ? 3 : 2
}

const openFillAll = (type, key) => {
  fillAllScope.value = { type, key }
  if (type === 'tingkat') {
    fillAllLabel.value = `Tingkat ${key}`
  } else if (type === 'jurusan') {
    fillAllLabel.value = `Jurusan ${key}`
  } else if (type === 'jurusan-tingkat') {
    const jr = key.jurusan_id
    fillAllLabel.value = `Jurusan ${jr} — Tingkat ${key.tingkat}`
  }
  fillAllForm.value = { tanggal: '', jam_mulai: '', durasi_menit: 90 }
  fillAllOpen.value = true
}

const applyFillAll = () => {
  if (fillAllScope.value.type === 'tingkat') {
    fillAllForTingkat(fillAllScope.value.key, { ...fillAllForm.value })
  } else if (fillAllScope.value.type === 'jurusan') {
    fillAllForJurusan(fillAllScope.value.key, { ...fillAllForm.value })
  } else if (fillAllScope.value.type === 'jurusan-tingkat') {
    fillAllForJurusan(
      fillAllScope.value.key.jurusan_id,
      { ...fillAllForm.value },
      fillAllScope.value.key.tingkat,
    )
  }
  fillAllOpen.value = false
}

const onCancel = () => emit('cancel')

const onSave = async () => {
  const res = await save()
  if (res.success) emit('saved')
}
</script>
