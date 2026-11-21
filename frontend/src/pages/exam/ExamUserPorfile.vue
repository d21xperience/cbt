<template>
  <q-page class="q-pa-md">
    <!-- PROFIL SISWA: Tampil di atas pada HP (col-12), di kanan pada Desktop (col-md-4 order-md-last) -->
    <div class="col-12 col-md-4 order-md-last">
      <!-- Card Profil Ringkas (Mobile First) -->
      <q-card flat bordered class="shadow-1 q-mb-md">
        <q-card-section class="row items-center q-pb-none">
          <q-avatar size="60px" class="q-mr-md shadow-1">
            <img :src="student.avatar || 'https://cdn.quasar.dev/img/avatar.png'" alt="Foto Siswa">
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bold text-grey-9">{{ student?.name || 'Siswa' }}</div>
            <div class="text-caption text-grey-7">NIS: {{ student?.nisn || '-' }}</div>
            <q-badge color="blue-2" text-color="blue-9" class="q-mt-xs q-px-sm text-weight-bold">
              {{ student?.class || 'Kelas' }}
            </q-badge>
          </div>
        </q-card-section>
        <!-- <q-card-actions align="right" class="q-pt-none">
          <q-btn flat color="negative" icon="logout" label="Keluar" size="sm" @click="logout" />
        </q-card-actions> -->
      </q-card>

      <!-- Riwayat Ujian (Desktop Only - di mobile pindah ke menu Riwayat) -->
      <!-- <q-card flat bordered class="shadow-1 gt-sm">
        <q-card-section class="bg-grey-2 q-py-sm">
          <div class="text-subtitle1 text-weight-bold text-grey-8 flex items-center">
            <q-icon name="history" class="q-mr-xs" /> Riwayat Ujian
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
            <q-item-section class="text-center text-grey-5 q-py-md">Belum ada riwayat ujian.</q-item-section>
          </q-item>
        </q-list>
      </q-card> -->
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
// import { useExamList } from '@/composables/exam/useExamList'
// const { completedExams } = useExamList()

const authStore = useAuthStore()

const student = computed(() => authStore.getStudent)


</script>
