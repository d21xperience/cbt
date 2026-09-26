<!-- src/pages/super/ExamScheduleManagement.vue -->
<template>
  <q-page padding class="bg-grey-1">
    <!-- Header -->
    <div class="q-mb-lg row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Manajemen Jadwal Ujian</h5>
        <div class="text-caption text-grey-7">
          Pemetaan distribusi waktu ujian tengah/akhir semester sekolah.
        </div>
      </div>
      <q-btn v-if="viewMode === 'LIST' && schedules.length > 0" color="primary" icon="add" label="Buat Jadwal Baru"
        @click="startWizard" />
    </div>

    <!-- KONDISI 1: TAMPILKAN JADWAL JIKA ADA -->
    <q-card v-if="viewMode === 'LIST'" flat bordered class="bg-white shadow-1">
      <q-table v-if="schedules.length > 0" :rows="schedules" :columns="columns" row-key="id" flat>
        <template v-slot:body-cell-end_time="props">
          <q-td :props="props" class="text-indigo text-weight-medium">
            {{ calculateEndTime(props.row.start_time, props.row.duration_minutes) }}
          </q-td>
        </template>
      </q-table>

      <!-- Tampilan jika belum ada jadwal sama sekali -->
      <div v-else class="q-pa-xl text-center">
        <q-icon name="event_busy" size="4rem" color="grey-5" />
        <div class="text-h6 text-grey-7 q-mt-md">Belum Ada Jadwal Ujian yang Dibuat</div>
        <p class="text-caption text-grey-6 q-mb-md">
          Silakan buat panduan distribusi jadwal awal untuk tahun pelajaran aktif ini.
        </p>
        <q-btn color="primary" icon="edit_calendar" label="Mulai Buat Jadwal Ujian" class="text-weight-bold"
          @click="startWizard" />
      </div>
    </q-card>

    <!-- KONDISI 2: ALUR FORM WIZARD (JIKA BELUM ADA / INGIN BUAT BARU) -->
    <q-card v-if="viewMode === 'WIZARD'" flat bordered class="bg-white q-pa-md shadow-1">
      <q-card-section class="q-px-none q-pt-none row justify-between items-center">
        <div class="text-subtitle1 text-weight-bold text-grey-9">
          Langkah 1: Tentukan Sasaran Kelas & Kurikulum
        </div>
        <q-btn flat round dense icon="arrow_back" color="grey-7" @click="viewMode = 'LIST'" />
      </q-card-section>

      <!-- Filter Pilihan Awal -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-4">
          <q-select v-model="wizard.grade" :options="gradeOptions" label="Pilih Tingkat Kelas" outlined dense emit-value
            map-options />
        </div>

        <!-- Info jenjang dari data sekolah (VER-007) -->
        <!-- VER-007/008: jenjang dari data sekolah -->
        <div v-if="schoolJenjang" class="col-12 col-sm-8">
          <q-banner dense rounded class="bg-blue-1 text-blue-9">
            <template v-slot:avatar>
              <q-icon name="school" color="primary" />
            </template>
            <div>
              <b>Jenjang Sekolah:</b> {{ getJenjangLabel(schoolJenjang) }}
              <span v-if="['SMK', 'MAK'].includes(schoolJenjang)" class="text-caption q-ml-sm">
                ({{ programDurationYears }} tahun)
              </span>
            </div>
            <div class="text-caption">
              Data ini otomatis dari profil sekolah. Hubungi super admin jika tidak sesuai.
            </div>
          </q-banner>
        </div>
        <div v-else class="col-12 col-sm-8">
          <q-banner dense rounded class="bg-orange-1 text-orange-9">
            <template v-slot:avatar>
              <q-icon name="warning" color="orange" />
            </template>
            Jenjang sekolah belum tersedia dari server. Hubungi super admin.
          </q-banner>
        </div>
      </div>

      <!-- Tombol Pemicu Load Semua Mata Pelajaran -->
      <div v-if="!allSubjectsLoaded" class="row justify-end">
        <q-btn color="indigo" icon="playlist_add_check" label="Tampilkan Semua Mata Pelajaran" @click="loadFormSubjects"
          :disable="!wizard.grade" />
      </div>

      <!-- TABEL DAFTAR SEMUA MAPEL UNTUK INPUT MASSAL -->
      <div v-if="allSubjectsLoaded" class="q-mt-md animate__animated animate__fadeIn">
        <q-separator class="q-my-md" />
        <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
          Langkah 2: Isi Parameter Waktu Setiap Mata Pelajaran
        </div>

        <q-list bordered separator class="rounded-borders bg-grey-1">
          <q-item v-for="mapel in subjectForms" :key="mapel.subject_id"
            class="q-py-md row items-center bg-white q-mb-sm rounded-borders shadow-1">
            <!-- Nama Mata Pelajaran -->
            <div class="col-12 col-md-3">
              <div class="text-weight-bold text-grey-9 text-subtitle2">
                {{ mapel.subject_name }}
              </div>
              <q-badge color="indigo-2" text-color="indigo-9" class="text-caption">Tingkat {{ wizard.grade }}</q-badge>
            </div>

            <!-- Input Tanggal, Jam Mulai, Durasi -->
            <div class="col-12 col-md-9 row q-col-gutter-sm">
              <div class="col-12 col-sm-4">
                <q-input v-model="mapel.date" type="date" label="Tanggal Ujian" outlined dense stack-label />
              </div>
              <div class="col-12 col-sm-3">
                <q-input v-model="mapel.start_time" type="time" label="Jam Mulai" outlined dense stack-label />
              </div>
              <div class="col-12 col-sm-2">
                <q-input v-model.number="mapel.duration" type="number" label="Durasi" outlined dense suffix="Mnt" />
              </div>
              <!-- Preview Real-time Waktu Selesai -->
              <div class="col-12 col-sm-3 flex items-center justify-end text-caption text-weight-bold text-indigo">
                Selesai: {{ calculateEndTime(mapel.start_time, mapel.duration) }}
              </div>
            </div>
          </q-item>
        </q-list>

        <!-- Aksi Simpan Final Massal -->
        <div class="row justify-end q-mt-lg q-gutter-sm">
          <q-btn flat label="Batal" color="grey-7" @click="viewMode = 'LIST'" />
          <q-btn color="green-9" icon="save" label="Simpan Semua Jadwal" :loading="savingMassal"
            @click="submitMassalSchedules" />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { ScheduleService } from '@/services/admin/ScheduleService'
import { useTenant } from '@/composables/super/useTenant'
import {
  getGradeOptionsForJenjang,
  hasMajor,
  getJenjangLabel,
} from '@/domain/school/jenjang'

const $q = useQuasar()

// ── Tenant context
const {
  jenjang: schoolJenjang,
  programDurationYears,
  loadTenantConfig,
} = useTenant()

// ── State
const viewMode = ref('LIST')
const allSubjectsLoaded = ref(false)
const loading = ref(false)
const savingMassal = ref(false)

const schedules = ref([])
const majors = ref([])
const subjectForms = ref([])

// Wizard: jenjang dihapus dari form state (diambil dari sekolah)
const wizard = ref({
  grade: '',
  major_id: '',
})

// ── Domain-driven computed
const gradeOptions = computed(() =>
  getGradeOptionsForJenjang(schoolJenjang.value, programDurationYears.value),
)
const showMajorField = computed(() => hasMajor(schoolJenjang.value))

const columns = [
  { name: 'grade', label: 'Tingkat', field: 'grade_level', align: 'left' },
  { name: 'subject', label: 'Mata Pelajaran', field: 'subject_name', align: 'left' },
  { name: 'date', label: 'Tanggal Mulai', field: 'start_date', align: 'left' },
  { name: 'start_time', label: 'Jam Mulai', field: 'start_time', align: 'left' },
  { name: 'end_time', label: 'Jam Selesai (Auto)', align: 'left' },
]

// ── Load schedules
const loadSchedulesList = async () => {
  loading.value = true
  try {
    const response = await ScheduleService.getSchedulesList()
    // Defensive nil-slice (Known Limitation): pastikan array
    schedules.value = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : []
  } catch (e) {
    console.error('[ExamManagement] load schedules failed:', e)
    schedules.value = []
  } finally {
    loading.value = false
  }
}

// ── Wizard
const startWizard = async () => {
  viewMode.value = 'WIZARD'
  allSubjectsLoaded.value = false

  // Hanya load programs kalau SMK/MAK
  if (showMajorField.value) {
    try {
      const res = await ScheduleService.getMajors()
      // VER-008: response {status, data:[...], count} — extract defensively
      majors.value = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : []
    } catch (e) {
      console.error('[ExamManagement] load programs failed:', e)
      majors.value = []
    }
  } else {
    majors.value = []
  }
}

const loadFormSubjects = async () => {
  try {
    const response = await ScheduleService.getSubjectsForForm()
    subjectForms.value = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : []
    allSubjectsLoaded.value = true
  } catch (err) {
    console.log(err)
    $q.notify({ type: 'negative', message: 'Gagal memuat form mata pelajaran.' })
  }
}

const submitMassalSchedules = async () => {
  if (!schoolJenjang.value) {
    $q.notify({
      type: 'negative',
      message: 'Jenjang sekolah belum tersedia. Tidak dapat menyimpan jadwal.',
    })
    return
  }

  const checkedSchedules = subjectForms.value.filter((s) => s.date && s.start_time)
  if (checkedSchedules.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Harap isi minimal tanggal & jam mulai pada salah satu mata pelajaran.',
    })
    return
  }

  // Kalau SMK/MAK dan program wajib dipilih untuk submit
  if (showMajorField.value && !wizard.value.major_id) {
    $q.notify({
      type: 'warning',
      message: 'Pilih program keahlian terlebih dahulu.',
    })
    return
  }

  savingMassal.value = true
  try {
    await ScheduleService.saveMassalSchedules({
      grade: wizard.value.grade,
      major: showMajorField.value ? wizard.value.major_id : null,
      schedules: checkedSchedules,
    })
    $q.notify({
      type: 'positive',
      message: 'Seluruh konfig jadwal massal sukses diarsipkan!',
    })
    viewMode.value = 'LIST'
    loadSchedulesList()
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal memproses penyimpanan massal.' })
  } finally {
    savingMassal.value = false
  }
}

// DOMAIN helper (akan dipindah ke domain/exam/ di Fase 3)
const calculateEndTime = (startTimeStr, durationMinutes) => {
  if (!startTimeStr || !durationMinutes) return '--:--'
  const [hours, minutes] = startTimeStr.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + parseInt(durationMinutes)
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

onMounted(async () => {
  await loadTenantConfig()
  loadSchedulesList()
})
</script>
