<!-- src/pages/exam/ExamRoom.vue -->
<template>
  <q-page :class="isMobile ? 'q-pa-sm exam-page-mobile' : 'q-pa-md'">
    <!-- ═══ MOBILE: Compact progress strip ═══ -->
    <div v-if="isMobile && examStore.currentQuestion" class="compact-strip q-mb-sm">
      <div class="row items-center no-wrap">
        <!-- Progress dots -->
        <div class="col">
          <div class="row items-center no-wrap">
            <div class="text-caption text-grey-7 q-mr-sm text-no-wrap">
              {{ examStore.answeredCount }}/{{ examStore.totalQuestions }}
            </div>
            <div class="dot-strip">
              <div v-for="(q, i) in examStore.questions" :key="q.id" class="dot" :class="{
                'dot-answered': !!examStore.answers[q.id],
                'dot-current': i === examStore.currentIndex,
              }" />
            </div>
          </div>
        </div>

        <!-- Warnings -->
        <div v-if="examStore.warnings > 0" class="text-caption text-negative text-no-wrap q-ml-sm">
          <q-icon name="warning" size="xs" /> {{ examStore.warnings }}/3
        </div>
      </div>
    </div>

    <!-- ═══ SOAL AREA ═══ -->
    <div v-if="examStore.currentQuestion" :class="isMobile ? '' : 'row q-col-gutter-md'">
      <!-- Soal -->
      <div :class="isMobile ? '' : 'col-12 col-md-8'">
        <QuestionRenderer :question="examStore.currentQuestion"
          :answer="examStore.answers[examStore.currentQuestion.id]" @update:answer="onAnswerChange" />

        <!-- Navigasi bawah (desktop only) -->
        <div v-if="!isMobile" class="row q-mt-md q-gutter-md justify-between">
          <q-btn icon="arrow_back" label="Sebelumnya" color="grey-7" :disable="examStore.currentIndex === 0"
            @click="prevQuestion" />

          <!-- Next -->
          <q-btn v-if="examStore.currentIndex < examStore.totalQuestions - 1" flat round icon="arrow_forward"
            color="primary" size="lg" aria-label="Selanjutnya" @click="nextQuestion" />

          <!-- Selesai (muncul HANYA di soal terakhir)
          <q-btn v-else color="positive" icon="check_circle" label="Selesai" no-caps size="md" @click="confirmSubmit" />-->
        </div>
      </div>

      <!-- Info Sidebar (desktop only) -->
      <div v-if="!isMobile" class="col-12 col-md-4">
        <q-card>
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Status Pengerjaan</div>
          </q-card-section>
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label>Progress</q-item-label>
                <q-linear-progress :value="examStore.progressPercentage / 100" color="primary" class="q-mt-sm" />
                <q-item-label caption>
                  {{ examStore.answeredCount }} dari
                  {{ examStore.totalQuestions }} dijawab
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>Peringatan Pelanggaran</q-item-label>
                <q-item-label caption class="text-negative text-weight-bold">
                  {{ examStore.warnings }} kali
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="flex flex-center" style="min-height: 60vh">
      <div class="text-center">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md text-h6 text-grey-7">Memuat soal ujian...</div>
      </div>
    </div>
  </q-page>

  <!-- ═══ MOBILE: Sticky bottom nav (di luar q-page) ═══ -->
  <div v-if="isMobile && examStore.currentQuestion" class="sticky-bottom-nav">
    <div class="row items-center no-wrap q-gutter-xs">
      <!-- Prev -->
      <q-btn flat round icon="arrow_back" color="grey-7" size="lg" :disable="examStore.currentIndex === 0"
        aria-label="Sebelumnya" @click="prevQuestion" />

      <!-- Progress text -->
      <div class="col text-center">
        <div class="text-caption text-grey-7">
          Soal
        </div>
        <div class="text-subtitle1 text-weight-bold">
          {{ examStore.currentIndex + 1 }} / {{ examStore.totalQuestions }}
        </div>
      </div>

      <!-- Next -->
      <!-- Next (muncul kalau belum soal terakhir) -->
      <q-btn v-if="examStore.currentIndex < examStore.totalQuestions - 1" flat round icon="arrow_forward"
        color="primary" size="lg" aria-label="Selanjutnya" @click="nextQuestion" />

      <!-- Selesai (muncul HANYA di soal terakhir) -->
      <q-btn v-else color="positive" icon="check_circle" label="Selesai" no-caps size="md" @click="confirmSubmit" />
    </div>
  </div>

  <!-- Lock Overlay -->
  <ExamLockOverlay :is-locked="examStore.isLocked" :lock-level="examStore.lockLevel"
    :violation-count="examStore.violationLog.length" @dev-unlock="onDevUnlock" />
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useExamStore } from '@/stores/exam/examActive'
import { useAuthStore } from '@/stores/auth'
import QuestionRenderer from '@/components/questions/QuestionRenderer.vue'
import ExamLockOverlay from '@/components/exam/ExamLockOverlay.vue'
import { useExamDeviceGuard } from '@/composables/useExamDeviceGuard'


const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const examStore = useExamStore()
const saveDebounce = ref(null)

const isMobile = computed(() => $q.screen.lt.md)
// Device guard: orientation lock portrait + wake lock (prevent screen sleep)
// Auto cleanup saat keluar ExamRoom
useExamDeviceGuard()
onMounted(async () => {
  // ── Guard: butuh JWT-B (cbt_exam_token)
  if (!authStore.cbtExamToken) {
    $q.notify({
      type: 'warning',
      message: 'Anda harus verifikasi token proktor terlebih dahulu.',
      position: 'top',
    })
    router.replace({ name: 'waiting-room' })
    return
  }

  if (examStore.totalQuestions === 0) {
    try {
      await examStore.startExam()
    } catch (e) {
      const status = e?.response?.status
      const errCode = e?.response?.data?.error
      if (status === 401 || status === 403 || errCode === 'token_expired') {
        authStore.clearExamToken()
        $q.notify({
          type: 'negative',
          message: 'Sesi ujian tidak valid. Minta token baru dari proktor.',
          position: 'top',
        })
        router.replace({ name: 'waiting-room' })
        return
      }
      $q.notify({
        type: 'negative',
        message: e.message || 'Gagal memuat soal. Refresh halaman.',
      })
    }
  }

  window.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  if (saveDebounce.value) clearTimeout(saveDebounce.value)
  window.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const handleVisibility = () => {
  if (document.visibilityState === 'hidden') examStore.flushPending()
}
const handleBeforeUnload = () => {
  examStore.flushPending()
}

const onAnswerChange = (answer) => {
  const qId = examStore.currentQuestion?.id
  if (!qId) return
  examStore.answers[qId] = answer
  if (saveDebounce.value) clearTimeout(saveDebounce.value)
  saveDebounce.value = setTimeout(() => {
    examStore.saveAnswer(qId, answer)
  }, 400)
}

const prevQuestion = () => {
  if (examStore.currentIndex > 0) examStore.activeIndex = examStore.currentIndex - 1
}
const nextQuestion = () => {
  if (examStore.currentIndex < examStore.totalQuestions - 1)
    examStore.activeIndex = examStore.currentIndex + 1
}

const confirmSubmit = () => {
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
    ok: { label: 'Ya, Kumpulkan', color: 'positive', flat: true },
    persistent: true,
  }).onOk(async () => {
    try {
      await examStore.submitExam(false)
      authStore.clearExamToken()
      $q.notify({
        type: 'positive',
        message: 'Ujian selesai dikumpulkan.',
        position: 'top',
      })
      router.replace({ name: 'waiting-room' })
    } catch {
      // Error sudah ditangani di store
    }
  })
}

const onDevUnlock = async () => {
  if (typeof window !== 'undefined' && window.__unlockExam) {
    window.__unlockExam('PROCTOR')
    await examStore.checkLockStatus()
  }
}
</script>

<style scoped>
/* ── Page padding-bottom supaya konten tidak ketutup sticky nav */
.exam-page-mobile {
  padding-bottom: 80px !important;
}

/* ── Compact strip */
.compact-strip {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* ── Dot strip */
.dot-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 100%;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #e0e0e0;
  transition: background 0.15s;
}

.dot-answered {
  background: #21ba45;
}

.dot-current {
  background: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.25);
}

/* ── Sticky bottom nav */
.sticky-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
