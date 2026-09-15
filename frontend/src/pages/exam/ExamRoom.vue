<!-- src/pages/exam/ExamRoom.vue -->
<template>
  <q-page class="q-pa-md" v-if="examStore.currentQuestion">
    <div class="row q-col-gutter-md">
      <!-- Area Soal -->
      <div class="col-12 col-md-8">
        <QuestionRenderer
          :question="examStore.currentQuestion"
          :answer="examStore.answers[examStore.currentQuestion.id]"
          @update:answer="onAnswerChange"
        />

        <!-- Navigasi Bawah -->
        <div class="row q-mt-md q-gutter-md justify-between">
          <q-btn
            icon="arrow_back"
            label="Sebelumnya"
            color="grey-7"
            :disable="examStore.currentIndex === 0"
            @click="prevQuestion"
          />

          <q-btn
            v-if="examStore.currentIndex < examStore.totalQuestions - 1"
            icon-right="arrow_forward"
            label="Selanjutnya"
            color="primary"
            @click="nextQuestion"
          />
          <q-btn
            v-else
            icon="check_circle"
            label="Selesai & Kumpulkan"
            color="positive"
            @click="confirmSubmit"
          />
        </div>
      </div>

      <!-- Info Sidebar -->
      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Status Pengerjaan</div>
          </q-card-section>
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label>Progress</q-item-label>
                <q-linear-progress
                  :value="examStore.progressPercentage / 100"
                  color="primary"
                  class="q-mt-sm"
                />
                <q-item-label caption
                  >{{ examStore.answeredCount }} dari
                  {{ examStore.totalQuestions }} dijawab</q-item-label
                >
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
  </q-page>

  <!-- Loading State -->
  <q-page v-else class="flex flex-center">
    <q-spinner color="primary" size="3em" />
    <div class="q-mt-md text-h6">Memuat soal ujian...</div>
  </q-page>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useExamStore } from '@/stores/exam/examActive'
import QuestionRenderer from '@/components/questions/QuestionRenderer.vue'

const $q = useQuasar()
const examStore = useExamStore()
const saveDebounce = ref(null)

onMounted(async () => {
  if (examStore.totalQuestions === 0) {
    try {
      await examStore.startExam()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || 'Gagal memuat soal. Refresh halaman.' })
    }
  }

  // Flush pending saat user pindah tab / tutup
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

// Debounce ringan di UI (server tetap batching)
const onAnswerChange = (answer) => {
  const qId = examStore.currentQuestion?.id
  if (!qId) return
  examStore.answers[qId] = answer // update UI instan
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
  }).onOk(() => examStore.submitExam(false))
}
</script>
