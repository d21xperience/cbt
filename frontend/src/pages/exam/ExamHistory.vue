<template>
  <q-page padding>
    <div class="text-h5 text-weight-bold text-grey-9 q-mb-md">
      <q-icon name="history" color="primary" size="sm" class="q-mr-sm" />
      Riwayat Ujian
    </div>

    <q-card flat bordered class="shadow-1">
      <q-list separator>
        <q-item v-for="history in completedExams" :key="history.id" class="q-py-md">
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white" icon="done_all" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold text-subtitle1">{{
              history.subject
            }}</q-item-label>
            <q-item-label caption>
              <q-icon name="schedule" size="xs" class="q-mr-xs" /> Selesai pada:
              {{ history.completedAt || '-' }}
            </q-item-label>
            <q-item-label caption v-if="history.score !== undefined">
              <q-icon name="grade" size="xs" class="q-mr-xs" /> Nilai:
              <strong>{{ history.score }}</strong>
            </q-item-label>
          </q-item-section>
          <q-item-section side top>
            <q-badge
              :color="history.status === 'NEEDS_REVIEW' ? 'orange' : 'positive'"
              :label="history.status || 'SUBMITTED'"
              class="q-px-sm q-py-xs"
            />
          </q-item-section>
        </q-item>

        <q-item v-if="loading">
          <q-item-section class="text-center q-py-md">
            <q-spinner color="primary" size="2em" />
          </q-item-section>
        </q-item>

        <q-item v-else-if="completedExams.length === 0">
          <q-item-section class="text-center text-grey-5 q-py-xl">
            <q-icon name="history_toggle_off" size="xl" class="q-mb-sm" />
            <div class="text-subtitle1">Belum ada riwayat ujian.</div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useExamList } from '@/composables/exam/useExamList'

const { loading, completedExams, fetchHistory } = useExamList()

onMounted(fetchHistory)
</script>
