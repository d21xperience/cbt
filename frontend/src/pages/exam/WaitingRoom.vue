<!-- src/pages/exam/WaitingRoom.vue -->
<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md">
      <!-- KOLOM KIRI: Informasi Utama & Ujian -->
      <div class="col-12 col-md-8">
        <!-- Banner Tata Tertib -->
        <q-banner inline-actions class="text-white bg-amber-9 q-mb-md rounded-borders shadow-2">
          <!-- <template v-slot:avatar>
            <q-icon name="warning" color="white" size="sm" />
          </template> -->
          <div class="text-weight-bold text-subtitle1">PENTING: Tata Tertib Ujian CBT</div>
          <ul class="q-pl-md q-my-xs text-body2">
            <li>
              Dilarang membuka tab browser lain atau meninggalkan aplikasi selama ujian berlangsung.
            </li>
            <li>Sistem akan mencatat otomatis jika Anda mencoba keluar dari halaman ujian.</li>
            <li>Pastikan koneksi internet Anda stabil sebelum menekan tombol "Mulai".</li>
          </ul>
        </q-banner>

        <!-- Judul Bagian Ujian -->
        <div class="text-h6 q-mb-sm text-grey-8 flex items-center">
          <q-icon name="assignment" class="q-mr-sm" color="primary" />
          Agenda Ujian Hari Ini
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-center q-pa-xl">
          <q-spinner-dots color="primary" size="3em" />
          <div class="q-ml-md text-grey-7">Memuat daftar ujian...</div>
        </div>

        <!-- Daftar Ujian -->
        <!-- Ganti bagian daftar ujian -->
        <div v-else class="row q-col-gutter-md">
          <!-- Section 1: Scheduled -->
          <div v-if="dashboard.scheduled.length > 0" class="col-12">
            <div class="text-subtitle2 text-grey-8 q-mb-sm">
              <q-icon name="event" class="q-mr-xs" color="primary" />
              Agenda Ujian
            </div>
            <div class="row q-col-gutter-md">
              <div v-for="exam in dashboard.scheduled" :key="exam.session_id" class="col-12">
                <q-card flat bordered class="shadow-1" :class="{ 'bg-red-1': exam.blocked }">
                  <q-card-section class="row items-center justify-between q-pb-none">
                    <div>
                      <div class="text-h6 text-primary text-weight-bold">{{ exam.title }}</div>
                      <div class="text-caption text-grey-7">{{ exam.session_type }}</div>
                    </div>
                    <q-badge :color="statusColor(exam.session_status)" :label="statusLabel(exam.session_status)"
                      class="q-px-sm q-py-xs text-weight-bold" />
                  </q-card-section>

                  <q-card-section class="row q-col-gutter-sm text-grey-9">
                    <div class="col-6 col-sm-3 flex items-center">
                      <q-icon name="schedule" class="q-mr-xs text-grey-6" />
                      <span>{{ formatTime(exam.start_time) }} - {{ formatTime(exam.end_time) }}</span>
                    </div>
                  </q-card-section>

                  <!-- Blocked alert -->
                  <q-banner v-if="exam.blocked" class="bg-red-2 text-red-9 q-mx-md q-mb-sm">
                    <template v-slot:avatar><q-icon name="lock" /></template>
                    <strong>Menunggu Persetujuan.</strong> {{ exam.blocked_reason || 'Hubungi admin sekolah.' }}
                  </q-banner>

                  <q-separator />

                  <q-card-actions align="right" class="q-pa-md">
                    <q-btn :color="exam.session_status === 'ACTIVE' && !exam.blocked ? 'primary' : 'grey-5'"
                      :disabled="exam.session_status !== 'ACTIVE' || exam.blocked" :label="buttonLabel(exam)"
                      icon-right="play_arrow" unelevated @click="openTokenDialog(exam)" />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </div>

          <!-- Section 2: Makeup Available -->
          <div v-if="dashboard.makeup_available.length > 0" class="col-12 q-mt-md">
            <div class="text-subtitle2 text-grey-8 q-mb-sm">
              <q-icon name="event_repeat" class="q-mr-xs" color="orange" />
              Ujian Susulan Tersedia
            </div>
            <div class="row q-col-gutter-md">
              <div v-for="exam in dashboard.makeup_available" :key="exam.session_id" class="col-12">
                <q-card flat bordered class="shadow-1 bg-orange-1">
                  <q-card-section class="row items-center justify-between q-pb-none">
                    <div>
                      <div class="text-h6 text-orange-9 text-weight-bold">{{ exam.title }}</div>
                      <q-badge color="orange" label="SUSULAN" />
                      <div class="text-caption text-grey-7 q-mt-xs">Alasan: {{ exam.makeup_reason || 'Tidak hadir' }}
                      </div>
                    </div>
                    <q-badge :color="statusColor(exam.session_status)" :label="statusLabel(exam.session_status)" />
                  </q-card-section>
                  <q-card-actions align="right" class="q-pa-md">
                    <q-btn color="orange" :disabled="exam.session_status !== 'ACTIVE' || exam.blocked"
                      label="Masuk Susulan" icon-right="play_arrow" unelevated @click="openTokenDialog(exam)" />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </div>

          <!-- Section 3: Empty state -->
          <div v-if="!dashboard.scheduled.length && !dashboard.makeup_available.length && !dashboard.completed.length"
            class="col-12 text-center q-pa-xl">
            <q-icon name="event_available" size="xl" color="grey-4" />
            <div class="text-grey-6 q-mt-sm">Tidak ada agenda ujian untuk hari ini.</div>
          </div>
        </div>
      </div>

      <!-- KOLOM KANAN: Profil & Riwayat -->
      <div class="col-12 col-md-4">
        <!-- Kartu Profil Siswa -->
        <q-card flat bordered class="text-center q-pa-md shadow-1 q-mb-md">
          <q-card-section class="">
            <q-avatar size="100px" class="q-mb-md shadow-2">
              <img :src="student.avatar || 'https://cdn.quasar.dev/img/avatar.png'" alt="Foto Siswa">
            </q-avatar>
            <div class="text-h6 text-weight-bold text-grey-9">{{ student?.name || 'Siswa' }}</div>
            <div class="text-subtitle2 text-grey-7">NIS: {{ student?.nisn || '-' }}</div>
            <q-badge color="blue-2" text-color="blue-9" class="q-mt-xs q-px-md text-weight-bold">
              {{ student?.class || 'Kelas' }}
            </q-badge>
          </q-card-section>

          <q-separator q-my-sm />

          <q-card-actions align="center">
            <q-btn flat color="negative" icon="logout" label="Keluar Aplikasi" @click="logout" />
          </q-card-actions>
        </q-card>

        <!-- Riwayat Ujian Selesai -->
        <q-card flat bordered class="shadow-1">
          <q-card-section class="bg-grey-2 q-py-sm">
            <div class="text-subtitle1 text-weight-bold text-grey-8 flex items-center">
              <q-icon name="history" class="q-mr-xs" />
              Riwayat Ujian
            </div>
          </q-card-section>

          <q-list separator>
            <q-item v-for="history in completedExams" :key="history.id">
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ history.subject }}</q-item-label>
                <q-item-label caption>{{ history.completedAt || 'Selesai' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="grey-4" text-color="grey-8" label="Selesai" class="text-weight-bold" />
              </q-item-section>
            </q-item>

            <q-item v-if="completedExams.length === 0">
              <q-item-section class="text-center text-grey-5 q-py-md">
                Belum ada riwayat ujian.
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <!-- DIALOG POPUP: Input Token Ujian -->
    <q-dialog v-model="tokenDialog.show" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="bg-primary text-white row items-center">
          <div class="text-h6">Konfirmasi Token</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body2 q-mb-md text-grey-8">
            Anda akan memulai ujian <strong>{{ tokenDialog.examSubject }}</strong>. Silakan masukkan token yang
            diberikan
            oleh pengawas ruangan Anda.
          </div>
          <q-input v-model="tokenDialog.inputToken" outlined label="Masukkan Token" mask="NNNNNN"
            hint="Format: 6 karakter (huruf kapital atau angka)" autofocus class="text-uppercase"
            @keyup.enter="submitToken">
            <template v-slot:prepend>
              <q-icon name="vpn_key" />
            </template>
          </q-input>

        </q-card-section>

        <q-card-actions align="right" class="text-primary q-pa-md">
          <q-btn flat label="Batal" v-close-popup @click="resetTokenDialog" />
          <q-btn unelevated color="primary" label="Mulai Ujian Sekarang" @click="submitToken"
            :loading="tokenVerifying" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useExamList } from '@/composables/exam/useExamList'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const { loading, dashboard, completedExams, fetchDashboard, verifyToken } = useExamList()

const student = computed(() => authStore.getStudent)

const tokenDialog = ref({ show: false, examId: '', examSubject: '', inputToken: '' })
const tokenVerifying = ref(false)

onMounted(fetchDashboard)

const statusColor = (s) => ({
  ACTIVE: 'green', NOT_STARTED: 'orange', EXPIRED: 'grey', CLOSED: 'grey',
}[s] || 'grey')

const statusLabel = (s) => ({
  ACTIVE: 'Tersedia', NOT_STARTED: 'Belum Dimulai', EXPIRED: 'Kadaluarsa', CLOSED: 'Ditutup',
}[s] || s)

const formatTime = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

const buttonLabel = (exam) => {
  if (exam.blocked) return 'Diblokir'
  if (exam.session_status === 'ACTIVE') return 'Masuk Ujian'
  if (exam.session_status === 'NOT_STARTED') return 'Belum Dibuka'
  return 'Kadaluarsa'
}

function openTokenDialog(exam) {
  tokenDialog.value = { show: true, examId: exam.exam_id, examSubject: exam.title, inputToken: '' }
}

function resetTokenDialog() {
  tokenDialog.value.show = false
  tokenDialog.value.inputToken = ''
  tokenVerifying.value = false
}

async function submitToken() {
  const { examId, inputToken } = tokenDialog.value
  if (!inputToken || inputToken.length < 6) {
    $q.notify({ type: 'warning', message: 'Token harus 6 karakter', position: 'top' })
    return
  }
  tokenVerifying.value = true
  try {
    const res = await verifyToken(examId, inputToken)
    if (res?.valid && res?.token) {
      authStore.setExamToken(res.token, examId)
      tokenDialog.value.show = false
      $q.notify({ type: 'positive', message: 'Token diterima. Mulai ujian...', position: 'top' })
      router.push({ name: 'exam-room' })
    } else {
      $q.notify({ type: 'negative', message: res?.error || 'Token tidak valid', position: 'top' })
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Verifikasi gagal', position: 'top' })
  } finally {
    tokenVerifying.value = false
  }
}

function logout() {
  $q.dialog({ title: 'Keluar', message: 'Keluar dari aplikasi?', ok: 'Keluar', cancel: 'Batal' })
    .onOk(() => { authStore.logout(); router.push({ name: 'participant-login' }) })
}
</script>

<style lang="scss" scoped>
.text-uppercase :deep(input) {
  text-transform: uppercase;
}
</style>
