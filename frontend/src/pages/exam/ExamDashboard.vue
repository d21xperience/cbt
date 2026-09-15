<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Dashboard Peserta</div>

    <!-- Daftar ujian yang sedang berlangsung / akan datang -->
    <div v-if="upcomingExams.length" class="q-mb-lg">
      <div class="text-subtitle1">Ujian Anda</div>
      <q-list bordered>
        <q-item v-for="exam in upcomingExams" :key="exam.id" class="q-py-md">
          <q-item-section>
            <q-item-label class="text-h6">{{ exam.name }}</q-item-label>
            <q-item-label caption>
              {{ exam.subject }} · {{ formatDate(exam.date) }} · {{ exam.duration }} menit
            </q-item-label>
            <q-item-label caption>
              Status: <q-badge :color="statusColor(exam)">{{ statusLabel(exam) }}</q-badge>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              :label="exam.hasCache ? 'Mulai' : 'Unduh Paket Soal'"
              :color="exam.hasCache ? 'primary' : 'orange'"
              @click="handleExamAction(exam)"
              :disable="exam.status === 'finished'"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Informasi tambahan: ujian tertinggal (jika ada) -->
    <div v-if="missedExams.length" class="q-mb-lg">
      <div class="text-subtitle1 text-negative">Ujian Tertinggal</div>
      <q-list bordered>
        <q-item v-for="exam in missedExams" :key="exam.id">
          <q-item-section>
            <q-item-label>{{ exam.name }}</q-item-label>
            <q-item-label caption>Jadwal: {{ formatDate(exam.date) }} (telah lewat)</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn label="Informasi" color="grey" @click="store.showExamInfo(exam)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Link ke halaman jadwal lengkap -->
    <div class="q-mt-md">
      <q-btn label="Lihat Semua Jadwal" color="secondary" :to="{ name: 'exam-schedule' }" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useExamScheduleStore as useExamStore } from '@/stores/exam/examSchedule'
import { useCacheManager } from '@/composables/exam/useCacheManager'
// import { useRouter } from 'vue-router';
// const router = useRouter()

const store = useExamStore()
const { hasValidPackage } = useCacheManager()

const exams = ref([])

const upcomingExams = computed(() =>
  exams.value.filter((e) => e.status !== 'finished' && new Date(e.date) > new Date()),
)
const missedExams = computed(() =>
  exams.value.filter((e) => e.status === 'finished' && new Date(e.date) < new Date()),
)

onMounted(async () => {
  // Ambil jadwal dari API
  const res = await store.getSchedule()
  exams.value = res.data
  // Cek cache untuk setiap ujian
  for (const exam of exams.value) {
    exam.hasCache = await hasValidPackage(exam.id)
  }
})

const handleExamAction = async (exam) => {
  if (exam.hasCache) {
    // Langsung masuk ExamSession
    store.setCurrentExam(exam.id, exam.name)
    // router.push('/exam/session');
    console.log('if')
  } else {
    console.log('else')
    // Redirect ke Preparation dengan examId
    // router.push({ name: 'exam-preparation', query: { examId: exam.id } });
  }
}

const formatDate = (iso) => new Date(iso).toLocaleString('id-ID')
const statusColor = (exam) => {
  if (exam.status === 'ongoing') return 'green'
  if (exam.status === 'upcoming') return 'blue'
  if (exam.status === 'finished') return 'grey'
}
const statusLabel = (exam) => {
  if (exam.hasCache) return 'Siap'
  return 'Perlu Unduh'
}
</script>
