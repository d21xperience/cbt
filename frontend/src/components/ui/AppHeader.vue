<!-- src/components/ui/AppHeader.vue -->
<template>
  <q-header :elevated="elevated" class="bg-primary text-white" role="banner">
    <q-toolbar class="q-py-sm">
      <q-btn v-if="showMenuToggle" flat dense round icon="menu" @click="$emit('toggle-drawer')"
        :aria-label="menuToggleAriaLabel" :aria-expanded="drawerOpen ? 'true' : 'false'" aria-controls="main-drawer" />
      <q-toolbar-title class="text-weight-medium">
        <div class="flex items-center">
          <q-icon name="school" class="q-mr-sm" aria-hidden="true" />
          <span class="text-h6" :class="{ 'text-h5': $q.screen.gt.sm }">{{ title }}</span>
          <q-badge v-if="badge" color="white" text-color="primary" class="q-ml-md q-px-sm" rounded aria-label="Role">{{
            badge }}</q-badge>
        </div>
      </q-toolbar-title>

      <div class="q-gutter-sm flex items-center" role="toolbar" aria-label="Header actions">
        <!-- Tombol Tahun Ajaran Global -->
        <q-btn flat dense no-caps text-color="white" icon="calendar_month" @click="academicDialogOpen = true">
          <div class="q-ml-xs text-caption text-weight-bold">{{ academicStore.academic_year }} - {{
            academicStore.semester }}</div>
        </q-btn>

        <!-- Tombol Mode Ujian Global -->
        <q-btn flat dense no-caps :color="academicStore.exam_mode ? 'yellow-5' : 'white'"
          :icon="academicStore.exam_mode ? 'assignment_turned_in' : 'assignment'" @click="examModeDialogOpen = true"
          class="q-ml-sm">
          <div class="q-ml-xs text-caption text-weight-bold">{{ academicStore.exam_mode || 'Mode Ujian' }}</div>
        </q-btn>

        <q-btn v-if="enableDarkMode" flat round :icon="themeStore.dark ? 'dark_mode' : 'light_mode'"
          @click="themeStore.toggleDark()"></q-btn>
        <slot name="actions" />
        <q-btn v-if="showNotifications" flat round icon="notifications" @click="$emit('notifications-click')">
          <q-badge color="red" floating>{{ notificationCount }}</q-badge>
        </q-btn>
        <q-btn v-if="showRefresh" flat round icon="refresh" @click="$emit('refresh')" :loading="isRefreshing"></q-btn>
        <q-btn flat round icon="logout" @click="$emit('logout')"></q-btn>
      </div>
    </q-toolbar>

    <slot name="secondary" />

    <!-- Dialog Tahun Ajaran -->
    <q-dialog v-model="academicDialogOpen" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="text-h6 bg-primary text-white">Ganti Tahun Ajaran</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="tempYear" :options="academicStore.academicYearOptions" label="Tahun Ajaran" outlined
            dense />
          <q-select v-model="tempSemester" :options="academicStore.semesterOptions" label="Semester" outlined dense
            emit-value map-options />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Simpan" @click="saveAcademicPeriod" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Mode Ujian -->
    <q-dialog v-model="examModeDialogOpen" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="text-h6 bg-primary text-white">Mode Ujian</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="tempExamMode"
            :options="[
              { label: 'UTS — Ujian Tengah Semester', value: 'UTS' },
              { label: 'UAS — Ujian Akhir Semester', value: 'UAS' },
              { label: 'UH — Ulangan Harian', value: 'UH' },
              { label: 'SURVEI — Survei/Uji Coba', value: 'SURVEI' }
            ]"
            label="Pilih Tipe Ujian" outlined dense emit-value map-options />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Matikan Mode" color="negative" @click="clearExamMode" />
          <q-btn color="primary" label="Simpan" @click="saveExamMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-header>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useThemeStore } from '@/stores/theme'
import { useAcademicStore } from '@/stores/academic'

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
const $q = useQuasar()

const academicDialogOpen = ref(false)
const examModeDialogOpen = ref(false)

const tempYear = ref(academicStore.academic_year)
const tempSemester = ref(academicStore.semester)
const tempExamMode = ref(academicStore.exam_mode)

const saveAcademicPeriod = () => {
  academicStore.setPeriod(tempYear.value, tempSemester.value)
  academicDialogOpen.value = false
  $q.notify({ type: 'positive', message: `Tahun ajaran diubah ke ${tempYear.value} - ${tempSemester.value}` })
}

const saveExamMode = () => {
  if (!tempExamMode.value) return
  academicStore.setExamMode(tempExamMode.value)
  examModeDialogOpen.value = false
  $q.notify({ type: 'positive', message: `Mode Ujian diaktifkan: ${tempExamMode.value}` })
}

const clearExamMode = () => {
  academicStore.setExamMode(null)
  tempExamMode.value = null
  examModeDialogOpen.value = false
  $q.notify({ type: 'info', message: 'Mode Ujian dimatikan.' })
}
</script>
