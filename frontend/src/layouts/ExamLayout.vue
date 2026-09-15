<!-- src/layouts/ExamLayout.vue -->
<template>
  <q-layout view="hHh lpr fFf" class="bg-grey-2">
    <q-header elevated class="bg-dark text-white">
      <q-toolbar>
        <q-toolbar-title class="text-subtitle1">
          <q-icon name="school" class="q-mr-sm" /> Ujian:
          {{ examStore.currentExamName || 'CBT Engine' }}
        </q-toolbar-title>

        <!-- Fullscreen Toggle -->
        <q-btn v-if="!examStore.fullscreenEnabled" flat round icon="fullscreen" @click="examStore.enableFullscreen()">
          <q-tooltip>Aktifkan Fullscreen</q-tooltip>
        </q-btn>
        <q-chip v-else color="positive" text-color="white" icon="fullscreen_exit" dense>
          Fullscreen
        </q-chip>

        <q-separator dark vertical class="q-mx-sm" />

        <!-- Timer -->
        <q-chip color="negative" text-color="white" icon="timer">
          {{ formattedTime }}
        </q-chip>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="showNav" show-if-above bordered :width="200" class="bg-white">
      <div class="q-pa-md grid-navigation">
        <q-btn v-for="(q, i) in examStore.questions" :key="q.id" :color="examStore.answers[q.id]
            ? 'positive'
            : i === examStore.currentIndex
              ? 'primary'
              : 'grey-4'
          " text-color="white" dense class="q-ma-xs" style="width: 35px; height: 35px" @click="goToQuestion(i)">
          {{ i + 1 }}
        </q-btn>
      </div>
      <div class="q-pa-md">
        <q-btn color="negative" label="Selesai" class="full-width" @click="submitExam" />
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam/examActive'

const $q = useQuasar()
const router = useRouter()
const examStore = useExamStore()
const showNav = ref(true)

const formattedTime = computed(() => {
  const total = examStore.secondsLeft || 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
})

const goToQuestion = (idx) => {
  if (idx >= 0 && idx < examStore.totalQuestions) {
    examStore.activeIndex = idx
  }
}

// ============ SUBMIT FLOW (FIXED) ============
const submitExam = () => {
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
    // ✅ Tidak async — panggil handler terpisah
    handleSubmit()
  })
}

const handleSubmit = async () => {
 console.log('keluar')
  // Loading indicator — biar user tahu proses jalan
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

    // ✅ Redirect EKSPLISIT — path langsung, tidak pakai name
    setTimeout(() => {
      router
        .push('/student/history')
        .then(() => {
          console.info('[Submit] Redirect ke /student/history berhasil')
        })
        .catch((err) => {
          console.error('[Submit] router.push gagal:', err)
          // Fallback: hard navigation
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
.grid-navigation {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}
</style>
