<!-- src/layouts/ExamLayout.vue -->
<template>
  <q-layout view="hHh lpr fFf" class="bg-grey-2">
    <!-- HEADER — sticky, compact di mobile -->
    <q-header elevated class="bg-dark text-white">
      <q-toolbar :class="isMobile ? 'q-py-xs' : ''">
        <!-- MOBILE: ☰ toggle drawer -->
        <q-btn
          v-if="isMobile"
          flat
          round
          dense
          icon="menu"
          @click="showNav = !showNav"
          class="q-mr-sm"
          aria-label="Menu"
        />

        <!-- Title (truncated on mobile) -->
        <q-toolbar-title :class="isMobile ? 'text-body2 ellipsis' : 'text-subtitle1'">
          <q-icon v-if="!isMobile" name="school" class="q-mr-sm" />
          {{ examStore.currentExamName || 'CBT Engine' }}
        </q-toolbar-title>

        <!-- Nomor soal (mobile, compact) -->
        <q-chip
          v-if="isMobile && examStore.totalQuestions > 0"
          dense
          color="primary"
          text-color="white"
          class="q-mr-xs"
        >
          {{ examStore.currentIndex + 1 }}/{{ examStore.totalQuestions }}
        </q-chip>

        <!-- Fullscreen Toggle (desktop only) -->
        <template v-if="!isMobile">
          <q-btn
            v-if="!examStore.fullscreenEnabled"
            flat
            round
            dense
            icon="fullscreen"
            @click="examStore.enableFullscreen()"
          >
            <q-tooltip>Aktifkan Fullscreen</q-tooltip>
          </q-btn>
          <q-chip v-else color="positive" text-color="white" icon="fullscreen_exit" dense>
            Fullscreen
          </q-chip>
          <q-separator dark vertical class="q-mx-sm" />
        </template>

        <!-- Timer -->
        <q-chip
          color="negative"
          text-color="white"
          icon="timer"
          :dense="isMobile"
          :class="isMobile ? 'text-caption' : ''"
        >
          {{ formattedTime }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <!-- DRAWER — desktop persistent, mobile overlay dari kiri -->
    <q-drawer
      v-model="showNav"
      show-if-above
      bordered
      :width="220"
      :breakpoint="1023"
      class="bg-white"
    >
      <div class="q-pa-md">
        <div class="text-caption text-grey-7 q-mb-sm text-uppercase">
          <q-icon name="grid_view" size="xs" class="q-mr-xs" />Navigasi Soal
        </div>
        <div class="grid-navigation">
          <q-btn
            v-for="(q, i) in examStore.questions"
            :key="q.id"
            :color="
              examStore.answers[q.id]
                ? 'positive'
                : i === examStore.currentIndex
                  ? 'primary'
                  : 'grey-4'
            "
            text-color="white"
            unelevated
            class="nav-btn"
            :aria-label="`Soal ${i + 1}`"
            @click="onNavClick(i)"
          >
            {{ i + 1 }}
          </q-btn>
        </div>

        <q-separator class="q-my-md" />

        <div class="text-caption text-grey-7">
          <div class="row items-center q-mb-xs">
            <div class="legend-dot bg-positive q-mr-xs" />
            Dijawab
          </div>
          <div class="row items-center q-mb-xs">
            <div class="legend-dot bg-primary q-mr-xs" />
            Sedang dibuka
          </div>
          <div class="row items-center">
            <div class="legend-dot bg-grey-4 q-mr-xs" />
            Belum dijawab
          </div>
        </div>
      </div>

      <div class="q-pa-md" style="position: absolute; bottom: 0; left: 0; right: 0">
        <q-btn
          color="negative"
          label="Kumpulkan Ujian"
          icon="check_circle"
          class="full-width"
          no-caps
          size="lg"
          @click="onSubmitClick"
        />
      </div>
    </q-drawer>

    <q-page-container>
      <!-- D.2: Banner Peringatan Mode Ujian -->
      <q-banner v-if="authStore.examMode" class="bg-warning text-black q-mb-md" rounded dense>
        <template v-slot:avatar>
          <q-icon name="warning" color="black" />
        </template>
        <strong>PERINGATAN MODE UJIAN:</strong> Anda sedang dalam sesi
        <strong>{{ authStore.examMode }}</strong
        >. Dilarang membuka tab baru, meninggalkan ruangan, atau melakukan tindakan yang melanggar
        tata tertib.
      </q-banner>

      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam/examActive'
import { useAuthStore } from '@/stores/auth' // D.2: Import auth store

const $q = useQuasar()
const router = useRouter()
const examStore = useExamStore()
const authStore = useAuthStore() // D.2: Instantiate auth store
const showNav = ref(false)

// Reactive breakpoint
const isMobile = computed(() => $q.screen.lt.md)
// ── Body class untuk prevent pull-to-refresh di mobile (scope hanya saat exam)
onMounted(() => {
  document.body.classList.add('exam-mode')
})
onUnmounted(() => {
  document.body.classList.remove('exam-mode')
})
const formattedTime = computed(() => {
  const total = examStore.secondsLeft || 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
})

const onNavClick = (idx) => {
  if (idx >= 0 && idx < examStore.totalQuestions) {
    examStore.activeIndex = idx
    // Auto-close drawer di mobile
    if (isMobile.value) showNav.value = false
  }
}

const onSubmitClick = () => {
  if (isMobile.value) showNav.value = false
  emitSubmit()
}

// ── SUBMIT FLOW
const emitSubmit = () => {
  const unanswered = examStore.totalQuestions - examStore.answeredCount
  let message = 'Apakah Anda yakin ingin mengumpulkan ujian?'
  if (unanswered > 0) {
    message += `<br><br><b class="text-negative">Masih ada ${unanswered} soal yang belum dijawab!</b>`
  }

  $q.dialog({
    title: 'Kumpulkan Ujian',
    message,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Ya, Kumpulkan', color: 'positive', flat: true, loading: false },
    persistent: true,
  }).onOk(() => {
    handleSubmit()
  })
}

const handleSubmit = async () => {
  $q.loading.show({ message: 'Mengirim jawaban...' })

  try {
    await examStore.submitExam(false)

    $q.loading.hide()
    $q.notify({
      type: 'positive',
      message: 'Ujian berhasil dikumpulkan!',
      position: 'top',
      timeout: 2000,
    })

    setTimeout(() => {
      router
        .push('/student/history')
        .then(() => {
          console.info('[Submit] Redirect ke /student/history berhasil')
        })
        .catch((err) => {
          console.error('[Submit] router.push gagal:', err)
          window.location.href = '/#/student/history'
        })
    }, 400)
  } catch (err) {
    $q.loading.hide()
    console.error('[Submit] gagal:', err)
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Gagal mengumpulkan ujian. Coba lagi.'
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
      timeout: 5000,
    })
  }
}
</script>

<style scoped>
/* ── Grid navigasi (Q7: 48px touch target) */
.grid-navigation {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.nav-btn {
  width: 100%;
  aspect-ratio: 1;
  min-width: 44px;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 600;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

/* ── Drawer padding bawah ekstra biar tidak nutup tombol submit */
.q-drawer .q-pa-md:last-child {
  padding-bottom: 24px;
}
</style>
<!-- Global — non-scoped, prevent pull-to-refresh saat exam -->
<style>
body.exam-mode {
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}
</style>
