<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold">
        <q-icon name="shield" class="q-mr-sm" color="primary" />
        Dashboard Proktor
      </div>
      <q-space />
      <q-btn flat icon="refresh" label="Refresh" @click="load" :loading="loading" />
    </div>

    <q-card v-if="sessions.length === 0 && !loading" flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="event_busy" size="xl" />
        <div class="q-mt-md">Anda belum ditugaskan mengawasi sesi ujian apa pun.</div>
        <div class="text-caption q-mt-sm">Hubungi admin sekolah untuk penugasan.</div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md">
      <div v-for="s in sessions" :key="s.session_id" class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">{{ s.exam_title }}</div>
            <div class="text-caption text-grey-7">
              {{ s.session_type }} · {{ formatRange(s.start_time, s.end_time) }}
            </div>
            <q-badge class="q-mt-sm" :color="statusColor(s.status)" :label="s.status" />
            <div class="q-mt-md">
              <q-icon name="group" /> {{ s.student_count }} peserta
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions>
            <q-btn flat color="primary" icon="visibility" label="Monitor Kelas"
              :to="{ name: 'proctor-monitoring', params: { sessionId: s.session_id } }" />
            <q-space />
            <q-btn flat color="warning" icon="vpn_key" label="Lihat Token"
              :to="{ name: 'admin-token-display', query: { session_id: s.session_id } }" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/boot/axios'

const loading = ref(false)
const sessions = ref([])

const load = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/proctor/sessions')
    sessions.value = data.data || []
  } catch (e) {
    console.error('Load proctor sessions:', e)
  } finally {
    loading.value = false
  }
}

const formatRange = (start, end) => {
  const f = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '-'
    }
  }
  return `${f(start)} - ${f(end)}`
}

const statusColor = (s) => {
  if (s === 'SCHEDULED') return 'blue'
  if (s === 'ACTIVE') return 'positive'
  if (s === 'CLOSED') return 'grey'
  return 'orange'
}

onMounted(load)
</script>
