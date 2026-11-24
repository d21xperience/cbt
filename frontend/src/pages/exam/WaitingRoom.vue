<!-- src/pages/exam/WaitingRoom.vue -->
<template>
  <q-page padding class="bg-grey-1">
    <!-- BANNER PERINGATAN (Mobile Friendly) -->
    <q-banner inline-actions class="text-white bg-amber-9 q-mb-md rounded-borders shadow-2">
      <div class="text-weight-bold text-subtitle1">PENTING: Tata Tertib Ujian CBT</div>
      <ul class="q-pl-md q-my-xs text-body2">
        <li>
          Dilarang membuka tab browser lain atau meninggalkan aplikasi selama ujian berlangsung.
        </li>
        <li>Sistem akan mencatat otomatis jika Anda mencoba keluar dari halaman ujian.</li>
        <li>Pastikan koneksi internet Anda stabil sebelum menekan tombol "Mulai".</li>
      </ul>
    </q-banner>

    <div class="row q-col-gutter-md">
      <!-- AGENDA UJIAN -->
      <div class="col-12 col-md-8 order-md-first">
        <div class="text-h6 q-mb-sm text-grey-8 flex items-center">
          <q-icon name="assignment" class="q-mr-sm" color="primary" /> Agenda Ujian Hari Ini
        </div>

        <div v-if="loading" class="flex flex-center q-pa-xl">
          <q-spinner-dots color="primary" size="3em" />
          <div class="q-ml-md text-grey-7">Memuat daftar ujian...</div>
        </div>

        <div v-else class="row q-col-gutter-md">
          <!-- Section 1: Scheduled -->
          <div v-if="dashboard.scheduled.length > 0" class="col-12">
            <div class="row q-col-gutter-md">
              <div v-for="exam in dashboard.scheduled" :key="exam.session_id" class="col-12">
                <q-card flat bordered class="shadow-1" :class="{ 'bg-red-1': exam.blocked }">
                  <q-card-section class="q-pb-none">
                    <div class="row items-center justify-between">
                      <div class="text-h6 text-primary text-weight-bold">{{ exam.title }}</div>
                      <q-badge
                        :color="statusOf(exam).color"
                        :label="statusOf(exam).label"
                        class="q-px-sm q-py-xs text-weight-bold"
                      />
                    </div>
                    <div class="text-caption text-grey-7">{{ exam.session_type }}</div>
                  </q-card-section>

                  <q-card-section class="q-py-sm">
                    <div class="flex items-start">
                      <q-icon name="event" class="q-mr-sm text-grey-6 q-mt-xs" />
                      <div>
                        <div class="text-weight-medium">
                          {{ formatRelativeExamDate(exam.start_time) }}
                        </div>
                        <div class="text-caption text-grey-6">
                          {{ formatTime(exam.start_time) }} - {{ formatTime(exam.end_time) }}
                          <span v-if="exam.duration_minutes">
                            · {{ exam.duration_minutes }} menit</span
                          >
                        </div>
                      </div>
                    </div>
                  </q-card-section>

                  <q-banner v-if="exam.blocked" class="bg-red-2 text-red-9 q-mx-md q-mb-sm">
                    <template v-slot:avatar><q-icon name="lock" /></template>
                    <strong>Menunggu Persetujuan.</strong>
                    {{ exam.blocked_reason || 'Hubungi admin.' }}
                  </q-banner>

                  <q-separator />
                  <q-card-actions class="q-pa-md">
                    <q-btn
                      :color="canEnterExam(exam) ? 'primary' : 'grey-5'"
                      :disabled="!canEnterExam(exam)"
                      :label="buttonLabel(exam)"
                      :icon-right="canEnterExam(exam) ? 'play_arrow' : 'lock_clock'"
                      unelevated
                      class="full-width"
                      size="lg"
                      @click="openTokenDialog(exam)"
                    />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </div>

          <!-- Section 2: Makeup Available -->
          <div v-if="dashboard.makeup_available.length > 0" class="col-12 q-mt-md">
            <div class="text-subtitle2 text-grey-8 q-mb-sm">
              <q-icon name="event_repeat" class="q-mr-xs" color="orange" /> Ujian Susulan Tersedia
            </div>
            <div class="row q-col-gutter-md">
              <div v-for="exam in dashboard.makeup_available" :key="exam.session_id" class="col-12">
                <q-card flat bordered class="shadow-1 bg-orange-1">
                  <q-card-section class="q-pb-none">
                    <div class="row items-center justify-between">
                      <div class="text-h6 text-orange-9 text-weight-bold">{{ exam.title }}</div>
                      <q-badge color="orange" label="SUSULAN" />
                    </div>
                    <div class="text-caption text-grey-7 q-mt-xs">
                      Alasan: {{ exam.makeup_reason || 'Tidak hadir' }}
                    </div>
                  </q-card-section>
                  <q-card-actions class="q-pa-md">
                    <q-btn
                      color="orange"
                      :disabled="exam.session_status !== 'ACTIVE' || exam.blocked"
                      label="Masuk Susulan"
                      icon-right="play_arrow"
                      unelevated
                      class="full-width"
                      size="lg"
                      @click="openTokenDialog(exam)"
                    />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="
              !dashboard.scheduled.length &&
              !dashboard.makeup_available.length &&
              !dashboard.completed.length
            "
            class="col-12 text-center q-pa-xl"
          >
            <q-icon name="event_available" size="xl" color="grey-4" />
            <div class="text-grey-6 q-mt-sm">Tidak ada agenda ujian untuk hari ini.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIALOG POPUP: Input Token Ujian (Responsive untuk Mobile) -->
    <q-dialog
      v-model="tokenDialog.show"
      persistent
      :position="$q.screen.lt.sm ? 'bottom' : 'standard'"
    >
      <q-card
        style="width: 100%; max-width: 400px; border-radius: 16px 16px 0 0"
        :class="{ 'q-pa-sm': $q.screen.lt.sm }"
      >
        <q-card-section class="bg-primary text-white row items-center q-py-sm">
          <div class="text-subtitle1 text-weight-bold">Konfirmasi Token</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body2 q-mb-md text-grey-8">
            Anda akan memulai ujian <strong>{{ tokenDialog.examSubject }}</strong
            >. Masukkan token dari pengawas ruangan.
          </div>
          <q-input
            v-model="tokenDialog.inputToken"
            outlined
            label="Masukkan Token"
            mask="NNNNNN"
            hint="Format: 6 karakter (huruf/angka)"
            autofocus
            class="text-uppercase"
            @keyup.enter="submitToken"
          >
            <template v-slot:prepend><q-icon name="vpn_key" /></template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Batal" v-close-popup @click="resetTokenDialog" />
          <q-btn
            unelevated
            color="primary"
            label="Mulai Ujian"
            @click="submitToken"
            :loading="tokenVerifying"
            class="full-width"
            size="lg"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useExamList } from '@/composables/exam/useExamList'
import {
  formatRelativeExamDate,
  getExamAccessState,
  getExamStatusLabel,
} from '@/utils/exam/dateHelpers'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const { loading, dashboard, fetchDashboard, verifyToken } = useExamList()

const tokenDialog = ref({ show: false, examId: '', examSubject: '', inputToken: '' })
const tokenVerifying = ref(false)

onMounted(fetchDashboard)

const statusOf = (exam) => getExamStatusLabel(exam)
const accessOf = (exam) => getExamAccessState(exam)
const canEnterExam = (exam) => {
  if (exam.blocked) return false
  if (exam.session_status !== 'ACTIVE') return false
  return accessOf(exam).canEnter
}
const buttonLabel = (exam) => {
  if (exam.blocked) return 'Diblokir'
  if (exam.session_status !== 'ACTIVE') {
    return exam.session_status === 'NOT_STARTED' ? 'Belum Dibuka' : 'Kadaluarsa'
  }
  const { canEnter, reason } = accessOf(exam)
  if (canEnter) return 'Masuk Ujian'
  if (reason === 'too_early') return 'Belum Waktunya'
  if (reason === 'expired') return 'Kadaluarsa'
  return 'Tidak Tersedia'
}
const formatTime = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
function openTokenDialog(exam) {
  if (!canEnterExam(exam)) {
    const { reason } = accessOf(exam)
    const msgs = {
      too_early: 'Ujian belum dibuka. Tunggu sampai waktu mulai.',
      expired: 'Waktu ujian sudah lewat.',
      no_schedule: 'Jadwal tidak valid.',
    }
    $q.notify({ type: 'warning', message: msgs[reason] || 'Ujian tidak dapat diakses.' })
    return
  }
  tokenDialog.value = { show: true, examId: exam.exam_id, examSubject: exam.title, inputToken: '' }
}

function resetTokenDialog() {
  tokenDialog.value.show = false
  tokenDialog.value.inputToken = ''
  tokenVerifying.value = false
}

async function submitToken() {
  const { examId, inputToken } = tokenDialog.value

  // ── CEK SESI LOGIN ──
  if (!authStore.token) {
    $q.notify({
      type: 'negative',
      message: 'Sesi login Anda habis. Silakan login ulang.',
      position: 'top',
    })
    router.push({ name: 'participant-login' })
    return
  }

  const cleanToken = inputToken.trim().toUpperCase()
  if (!cleanToken || cleanToken.length < 6) {
    $q.notify({ type: 'warning', message: 'Token harus 6 karakter', position: 'top' })
    return
  }

  tokenVerifying.value = true
  try {
    const res = await verifyToken(examId, cleanToken)
    if (res?.valid && res?.token) {
      authStore.setExamToken(res.token, examId)
      tokenDialog.value.show = false
      $q.notify({ type: 'positive', message: 'Token diterima. Mulai ujian...', position: 'top' })
      router.push({ name: 'exam-room' })
    } else {
      $q.notify({ type: 'negative', message: res?.error || 'Token tidak valid', position: 'top' })
    }
  } catch (err) {
    const msg = err.response?.data?.error || 'Verifikasi gagal'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    tokenVerifying.value = false
  }
}

// function logout() {
//   $q.dialog({ title: 'Keluar', message: 'Keluar dari aplikasi?', ok: 'Keluar', cancel: 'Batal' })
//     .onOk(() => { authStore.logout(); router.push({ name: 'participant-login' }) })
// }
</script>

<style lang="scss" scoped>
.text-uppercase :deep(input) {
  text-transform: uppercase;
}
</style>
