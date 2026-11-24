<!-- src/components/ui/AppHeader.vue -->
<template>
  <q-header :elevated="elevated" class="bg-primary text-white" role="banner">
    <q-toolbar class="q-py-sm">
      <q-btn
        v-if="showMenuToggle"
        flat
        dense
        round
        icon="menu"
        @click="$emit('toggle-drawer')"
        :aria-label="menuToggleAriaLabel"
        :aria-expanded="drawerOpen ? 'true' : 'false'"
        aria-controls="main-drawer"
      />
      <q-toolbar-title class="text-weight-medium">
        <div class="flex items-center">
          <q-icon name="school" class="q-mr-sm" aria-hidden="true" />
          <span class="text-h6" :class="{ 'text-h5': $q.screen.gt.sm }">{{ title }}</span>
          <q-badge
            v-if="badge"
            color="white"
            text-color="primary"
            class="q-ml-md q-px-sm"
            rounded
            aria-label="Role"
            >{{ badge }}</q-badge
          >
        </div>
      </q-toolbar-title>

      <div class="q-gutter-sm flex items-center" role="toolbar" aria-label="Header actions">
        <!-- ===== ADMIN: kontrol Mode Ujian & Tahun Ajaran (bisa buka dialog & reset) ===== -->
        <template v-if="isAdmin">
          <!-- Tombol Mode Ujian Global -->
          <q-btn
            flat
            dense
            no-caps
            :color="academicStore.exam_mode ? 'yellow-5' : 'white'"
            :icon="academicStore.exam_mode ? 'assignment_turned_in' : 'assignment'"
            @click="examModeDialogOpen = true"
            class="q-ml-sm"
          >
            <div class="q-ml-xs text-caption text-weight-bold">
              {{ academicStore.exam_mode || 'Mode Ujian' }}
            </div>
          </q-btn>
          <!-- Tombol Tahun Ajaran Global -->
          <q-btn
            flat
            dense
            no-caps
            text-color="white"
            icon="calendar_month"
            @click="academicDialogOpen = true"
            :disable="academicStore.exam_mode ? true : false"
          >
            <div class="q-ml-xs text-caption text-weight-bold">
              {{ academicStore.academic_year }} - {{ academicStore.semester }}
            </div>
          </q-btn>
        </template>

        <!-- ===== NON-ADMIN (siswa/proktor): chip status READ-ONLY, tidak bisa reset ===== -->
        <template v-else>
          <q-chip
            v-if="academicStore.exam_mode"
            color="yellow-5"
            text-color="black"
            dense
            icon="assignment_turned_in"
            class="q-ml-sm"
          >
            {{ academicStore.exam_mode }}
          </q-chip>
          <q-chip color="white" text-color="primary" dense icon="calendar_month">
            {{ academicStore.academic_year }} - {{ academicStore.semester }}
          </q-chip>
        </template>

        <q-btn
          v-if="enableDarkMode"
          flat
          round
          :icon="themeStore.dark ? 'dark_mode' : 'light_mode'"
          @click="themeStore.toggleDark()"
        ></q-btn>
        <slot name="actions" />
        <q-btn
          v-if="showNotifications"
          flat
          round
          icon="notifications"
          @click="$emit('notifications-click')"
        >
          <q-badge color="red" floating>{{ notificationCount }}</q-badge>
        </q-btn>
        <q-btn
          v-if="showRefresh"
          flat
          round
          icon="refresh"
          @click="$emit('refresh')"
          :loading="isRefreshing"
        ></q-btn>
        <q-btn flat round icon="logout" @click="$emit('logout')"></q-btn>
      </div>
    </q-toolbar>

    <slot name="secondary" />

    <!-- Dialog Tahun Ajaran (admin only) -->
    <q-dialog v-model="academicDialogOpen" persistent v-if="isAdmin">
      <q-card style="min-width: 350px">
        <q-card-section class="text-h6 bg-primary text-white">Ganti Tahun Ajaran</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="tempYear"
            :options="academicStore.academicYearOptions"
            label="Tahun Ajaran"
            outlined
            dense
          />
          <q-select
            v-model="tempSemester"
            :options="academicStore.semesterOptions"
            label="Semester"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Simpan" @click="saveAcademicPeriod" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Mode Ujian (admin only) -->
    <q-dialog v-model="examModeDialogOpen" v-if="isAdmin" persistent>
      <q-card v-if="filteredLessons.length == 0" style="min-width: 450px">
        <q-card-section class="text-h6 bg-primary text-white">Mode Ujian</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-banner class="bg-red-1 text-red-9 q-mb-md" rounded dense>
            <template v-slot:avatar>
              <q-icon name="warning" color="red" />
            </template>
            <strong>Harap diisi pembelajaran</strong>. Mode ujian akan aktif jika pembelajaran sudah
            diisi!
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn label="Ok" color="black" v-close-popup :disable="isSavingMode" />
        </q-card-actions>
      </q-card>

      <q-card v-else style="min-width: 450px">
        <q-card-section class="text-h6 bg-primary text-white">Mode Ujian</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-banner class="bg-red-1 text-red-9 q-mb-md" rounded dense>
            <template v-slot:avatar>
              <q-icon name="warning" color="red" />
            </template>
            <strong>PERINGATAN:</strong> Mengaktifkan mode ujian adalah
            <strong>tindakan permanen</strong>. Ini akan:
            <ul class="q-mt-xs q-mb-none" style="padding-left: 20px">
              <li>Mengunci konteks <strong>Tahun Ajaran + Semester + Tipe Ujian</strong>.</li>
              <li><strong>Mencabut semua kartu ujian lama</strong> (QR & password hangus).</li>
              <li>Menghapus semua sesi ujian peserta yang sedang berjalan.</li>
            </ul>
            <div class="q-mt-sm text-caption text-weight-bold">
              Pastikan Data Referensi (Kelas, Mapel, Siswa) sudah siap sebelum melanjutkan.
            </div>
          </q-banner>

          <!-- ✅ SINKRONISASI MASTER: Dinamis dari DATA REFERENSI -> Jenis Ujian -->
          <q-select
            v-model="tempExamMode"
            :options="filteredExamTypes"
            option-label="nama"
            option-value="kode"
            label="Pilih Tipe Ujian"
            outlined
            dense
            emit-value
            map-options
            :disable="isSavingMode"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" color="grey-7" v-close-popup :disable="isSavingMode" />
          <q-btn
            flat
            label="Matikan Mode"
            color="negative"
            @click="clearExamMode"
            :loading="isSavingMode"
          />
          <q-btn
            color="primary"
            label="Simpan & Reset Data"
            @click="confirmSaveExamMode"
            :loading="isSavingMode"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-header>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useThemeStore } from '@/stores/theme'
import { useAcademicStore } from '@/stores/academic'
import { useAuthStore } from '@/stores/auth'
import { useExamTypes } from '@/composables/admin/useExamTypes'
import { useLessons } from '@/composables/admin/useLessons'
const { filteredLessons } = useLessons()
const isSavingMode = ref(false)
defineProps({
  title: { type: String, required: true },
  badge: { type: String, default: '' },
  elevated: { type: Boolean, default: true },
  showMenuToggle: { type: Boolean, default: false },
  drawerOpen: { type: Boolean, default: false },
  menuToggleAriaLabel: { type: String, default: 'Toggle navigation menu' },
  enableDarkMode: { type: Boolean, default: true },
  showNotifications: { type: Boolean, default: false },
  notificationCount: { type: Number, default: 0 },
  showRefresh: { type: Boolean, default: false },
  isRefreshing: { type: Boolean, default: false },
})

defineEmits(['toggle-drawer', 'notifications-click', 'refresh', 'logout'])

const themeStore = useThemeStore()
const academicStore = useAcademicStore()
const authStore = useAuthStore()
const $q = useQuasar()

// D.2: hanya ADMIN/SUPER_ADMIN yang boleh menyentuh API & kontrol admin
const isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(authStore.role))

const academicDialogOpen = ref(false)
const examModeDialogOpen = ref(false)

// autoLoad:false → tidak auto-fetch saat mount (mencegah 403 untuk siswa)
const { filteredExamTypes, loadExamTypes } = useExamTypes({ autoLoad: false })

// Fetch exam-types HANYA jika role admin (sinkron master tetap hidup untuk admin)
watch(
  isAdmin,
  (v) => {
    if (v) loadExamTypes()
  },
  { immediate: true },
)

const tempYear = ref(academicStore.academic_year)
const tempSemester = ref(academicStore.semester)
const tempExamMode = ref(academicStore.exam_mode)

const saveAcademicPeriod = () => {
  academicStore.setPeriod(tempYear.value, tempSemester.value)
  academicDialogOpen.value = false
  $q.notify({
    type: 'positive',
    message: `Tahun ajaran diubah ke ${tempYear.value} - ${tempSemester.value}`,
  })
}

// Konfirmasi ganda untuk aksi destruktif
const confirmSaveExamMode = () => {
  if (!tempExamMode.value) return
  $q.dialog({
    title: 'Konfirmasi Reset Massal',
    message: `Anda akan mengaktifkan ujian <b>${tempExamMode.value}</b>.<br><br>Semua kartu ujian periode sebelumnya akan <b>DICABUT</b> dan tidak dapat digunakan lagi.<br><br>Ketik <b>RESET</b> untuk melanjutkan.`,
    html: true,
    prompt: {
      model: '',
      type: 'text',
    },
    cancel: true,
    persistent: true,
  }).onOk(async (val) => {
    if (String(val).toUpperCase() !== 'RESET') {
      $q.notify({ type: 'negative', message: 'Konfirmasi gagal. Ketik "RESET" dengan benar.' })
      return
    }
    await executeSaveExamMode()
  })
}

const executeSaveExamMode = async () => {
  isSavingMode.value = true
  const result = await academicStore.setExamMode(tempExamMode.value)
  isSavingMode.value = false
  if (result.success) {
    examModeDialogOpen.value = false
    $q.notify({ type: 'positive', message: `Mode Ujian diaktifkan: ${tempExamMode.value}` })
  } else {
    $q.notify({ type: 'negative', message: result.message })
  }
}

// Fungsi lama saveExamMode dihapus/diganti dengan confirmSaveExamMode

const clearExamMode = () => {
  $q.dialog({
    title: 'Matikan Mode Ujian?',
    message:
      'Data peserta dan kartu ujian yang sudah di-reset <b>TIDAK AKAN KEMBALI</b>. Mematikan mode hanya mengosongkan konteks ujian.',
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    isSavingMode.value = true
    const result = await academicStore.setExamMode(null)
    isSavingMode.value = false
    if (result.success) {
      tempExamMode.value = null
      examModeDialogOpen.value = false
      $q.notify({ type: 'info', message: 'Mode Ujian dimatikan.' })
    } else {
      $q.notify({ type: 'negative', message: result.message })
    }
  })
}
</script>
