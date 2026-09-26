<!-- src/pages/admin/Archive.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">
      <q-icon name="archive" color="primary" size="md" class="q-mr-sm" />
      Archive Semester
    </div>

    <div class="row q-col-gutter-md">
      <!-- Form Archive -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section class="bg-negative text-white">
            <div class="text-h6">
              <q-icon name="warning" class="q-mr-sm" />
              PERHATIAN: Operasi Berbahaya
            </div>
          </q-card-section>

          <q-card-section>
            <q-banner class="bg-orange-1 text-orange-9 q-mb-md" rounded>
              <template v-slot:avatar>
                <q-icon name="error_outline" color="orange" />
              </template>
              <b>Archive akan:</b>
              <ul class="q-mb-none">
                <li>Mengunci semua data semester yang dipilih</li>
                <li>Memindahkan data ke storage arsip (read-only)</li>
                <li>Reset data aktif untuk semester baru</li>
              </ul>
              <br />
              <b>Tindakan ini TIDAK DAPAT dibatalkan!</b>
            </q-banner>

            <q-form @submit.prevent="showConfirmDialog" class="q-gutter-md">
              <q-select v-model="archiveForm.school_id" :options="schoolOptions" label="Sekolah" outlined emit-value
                map-options :rules="[(val) => !!val || 'Sekolah wajib dipilih']">
                <template v-slot:prepend><q-icon name="school" /></template>
              </q-select>

              <q-select v-model="archiveForm.semester_id" :options="semesterOptions"
                label="Semester yang akan di-archive" outlined emit-value map-options
                :rules="[(val) => !!val || 'Semester wajib dipilih']">
                <template v-slot:prepend><q-icon name="calendar_today" /></template>
              </q-select>

              <q-toggle v-model="archiveForm.is_end_of_academic_year"
                label="Archive Akhir Tahun Ajaran (reset total sistem)" color="negative" />

              <q-banner v-if="archiveForm.is_end_of_academic_year" class="bg-negative text-white q-mb-md" rounded>
                <template v-slot:avatar>
                  <q-icon name="dangerous" />
                </template>
                <b>MODE AKHIR TAHUN AJARAN:</b> Semua data akan di-reset termasuk konfigurasi ujian,
                soal, dan sesi.
              </q-banner>

              <q-input v-model="confirmPassword" label="Konfirmasi Password Admin" type="password" outlined
                :rules="[(val) => !!val || 'Password wajib diisi']">
                <template v-slot:prepend><q-icon name="lock" /></template>
              </q-input>

              <q-btn type="submit" color="negative" icon="archive" label="Mulai Archive" class="full-width"
                :loading="adminStore.isArchiving" />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Riwayat Archive -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Riwayat Archive</div>

            <q-table :rows="adminStore.archiveHistory" :columns="archiveColumns" row-key="id" flat bordered dense
              no-data-label="Belum ada riwayat archive">
              <template v-slot:body-cell-timestamp="props">
                <q-td :props="props">
                  {{ formatDate(props.row.timestamp) }}
                </q-td>
              </template>

              <template v-slot:body-cell-is_end_of_academic_year="props">
                <q-td :props="props">
                  <q-badge :color="props.row.is_end_of_academic_year ? 'negative' : 'primary'"
                    :label="props.row.is_end_of_academic_year ? 'Akhir Tahun' : 'Semester'" />
                </q-td>
              </template>

              <template v-slot:body-cell-stats="props">
                <q-td :props="props">
                  <div class="text-caption">
                    <div>
                      <b>{{ props.row.archived_participants }}</b> peserta
                    </div>
                    <div>
                      <b>{{ props.row.archived_exams }}</b> ujian
                    </div>
                    <div>
                      <b>{{ props.row.archived_sessions }}</b> sesi
                    </div>
                  </div>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog Konfirmasi Berlapis -->
    <q-dialog v-model="showFinalConfirm" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">
            <q-icon name="dangerous" class="q-mr-sm" />
            Konfirmasi Akhir
          </div>
        </q-card-section>

        <q-card-section>
          <div class="text-body1 q-mb-md">Anda akan melakukan archive dengan detail:</div>

          <q-list bordered separator>
            <q-item>
              <q-item-section>
                <q-item-label>Sekolah</q-item-label>
                <q-item-label caption>{{ getSchoolName() }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>Semester</q-item-label>
                <q-item-label caption>{{ getSemesterLabel() }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>Mode</q-item-label>
                <q-item-label caption>
                  <q-badge :color="archiveForm.is_end_of_academic_year ? 'negative' : 'primary'" :label="archiveForm.is_end_of_academic_year ? 'Akhir Tahun Ajaran' : 'Semester Biasa'
                    " />
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-banner class="bg-negative text-white q-mt-md" rounded>
            <b>PERINGATAN:</b> Setelah archive dimulai, tidak ada cara untuk mengembalikan data!
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Batal" color="grey" v-close-popup />
          <q-btn label="YA, LAKUKAN ARCHIVE" color="negative" :loading="adminStore.isArchiving"
            @click="performArchive" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAdminStore } from '@/stores/admin/dashboard'

const $q = useQuasar()
const adminStore = useAdminStore()

const showFinalConfirm = ref(false)
const confirmPassword = ref('')

const archiveForm = reactive({
  school_id: '',
  semester_id: '',
  is_end_of_academic_year: false,
})

const schoolOptions = [
  { label: 'SMA Negeri 1 Jakarta', value: 'school-001' },
  { label: 'SMA Swasta Cendekia', value: 'school-002' },
]

const semesterOptions = [
  { label: '2024/2025 - Ganjil', value: '20241' },
  { label: '2024/2025 - Genap', value: '20242' },
  { label: '2025/2026 - Ganjil', value: '20251' },
]

const archiveColumns = [
  { name: 'timestamp', label: 'Waktu', field: 'timestamp', align: 'left' },
  { name: 'semester_id', label: 'Semester', field: 'semester_id', align: 'center' },
  {
    name: 'is_end_of_academic_year',
    label: 'Mode',
    field: 'is_end_of_academic_year',
    align: 'center',
  },
  { name: 'stats', label: 'Data Diarsip', field: 'stats', align: 'center' },
  { name: 'performed_by', label: 'Oleh', field: 'performed_by', align: 'center' },
]

const formatDate = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

const getSchoolName = () => {
  const found = schoolOptions.find((s) => s.value === archiveForm.school_id)
  return found ? found.label : archiveForm.school_id
}

const getSemesterLabel = () => {
  const found = semesterOptions.find((s) => s.value === archiveForm.semester_id)
  return found ? found.label : archiveForm.semester_id
}

/**
 * Buka dialog konfirmasi.
 *
 * PENTING (Batch B1):
 * Password TIDAK divalidasi di frontend — hanya cek "terisi".
 * Verifikasi password REAL dilakukan backend di POST /admin/archive.
 * Ini mencegah bypass via curl / devtools.
 */
const showConfirmDialog = () => {
  if (!confirmPassword.value || confirmPassword.value.length < 4) {
    $q.notify({
      type: 'negative',
      message: 'Password admin wajib diisi (min. 4 karakter).',
    })
    return
  }
  showFinalConfirm.value = true
}

const performArchive = async () => {
  try {
    const result = await adminStore.performArchive({
      school_id: archiveForm.school_id,
      semester_id: archiveForm.semester_id,
      is_end_of_academic_year: archiveForm.is_end_of_academic_year,
      password: confirmPassword.value,        // ← dikirim ke backend
    })

    showFinalConfirm.value = false

    $q.dialog({
      title: 'Archive Berhasil',
      message: `
        <div class="text-center">
          <q-icon name="check_circle" color="positive" size="60px" />
          <div class="text-h6 q-mt-md">Archive berhasil dilakukan!</div>
          <div class="q-mt-md">
            <b>${result.archived_participants}</b> peserta diarsipkan<br>
            <b>${result.archived_exams}</b> ujian diarsipkan<br>
            <b>${result.archived_sessions}</b> sesi diarsipkan
          </div>
        </div>
      `,
      html: true,
      persistent: true,
      ok: 'Selesai',
    }).onOk(() => {
      archiveForm.school_id = ''
      archiveForm.semester_id = ''
      archiveForm.is_end_of_academic_year = false
      confirmPassword.value = ''
    })
  } catch (error) {
    const status = error?.response?.status
    const msg =
      status === 401
        ? 'Password admin salah.'
        : status === 403
          ? 'Anda tidak memiliki izin melakukan archive.'
          : error?.response?.data?.message || 'Gagal melakukan archive.'

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: msg,
    })
  }
}

onMounted(async () => {
  await adminStore.fetchArchiveHistory()
})
</script>
