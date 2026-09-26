<template>
  <q-page padding>
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div class="row items-center">
        <div class="text-h5 text-weight-bold">
          <q-icon name="shield" class="q-mr-sm" color="primary" />
          Dashboard Proktor
        </div>
        <q-chip dense color="blue-grey-1" text-color="blue-grey-9" icon="assignment_ind" class="q-ml-md">
          Sesi yang ditugaskan
        </q-chip>
      </div>
      <q-btn flat icon="refresh" label="Refresh" @click="load" :loading="loading" />
    </div>

    <!-- Profile Card -->
    <q-card v-if="profile" flat bordered class="q-mb-md"
      style="background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)">
      <q-card-section class="text-white">
        <div class="row items-center">
          <q-avatar size="56px" color="white" text-color="primary" icon="person" />
          <div class="q-ml-md">
            <div class="text-h6 text-weight-bold">{{ profile.name || 'Guru' }}</div>
            <div class="text-caption text-blue-2 q-mt-xs">
              <q-icon name="school" size="xs" class="q-mr-xs" />
              <span v-if="isHomeroomTeacher">
                Wali Kelas {{ homeroomClass?.name }}
              </span>
              <span v-else>Guru Mata Pelajaran</span>
              <template v-if="teachingSubjects.length > 0">
                <span> · </span>
                <span>Guru {{teachingSubjects.map((s) => s.name).join(', ')}}</span>
              </template>
            </div>
          </div>
          <q-space />
          <q-chip v-if="isHomeroomTeacher" color="white" text-color="primary" icon="verified" dense
            class="text-weight-bold">
            WALI KELAS
          </q-chip>
        </div>
      </q-card-section>
    </q-card>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Sesi Ditugaskan</div>
            <div class="text-h5 text-weight-bold text-primary">{{ sessions.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Mapel Diampu</div>
            <div class="text-h5 text-weight-bold text-teal">{{ teachingSubjects.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Sesi Aktif</div>
            <div class="text-h5 text-weight-bold text-positive">{{ activeSessionCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Kelas Binaan</div>
            <div class="text-h6 text-weight-bold text-indigo text-ellipsis">
              {{ isHomeroomTeacher ? homeroomClass?.name || '-' : '—' }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Aksi Cepat -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-md">
          <q-icon name="bolt" color="primary" class="q-mr-xs" />
          Aksi Cepat
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-6 col-md-3">
            <q-btn color="primary" icon="lock_open" label="Buka Blok" :to="{ name: 'proctor-unlock' }"
              class="full-width" no-caps unelevated />
          </div>
          <div class="col-6 col-md-3">
            <q-btn color="teal" icon="quiz" label="Kelola Soal" :to="{ name: 'admin-questions' }" class="full-width"
              no-caps unelevated />
          </div>
          <div class="col-6 col-md-3">
            <q-btn color="indigo" icon="vpn_key" label="Token Ujian" :to="{ name: 'admin-token-display' }"
              class="full-width" no-caps unelevated />
          </div>
          <div v-if="isHomeroomTeacher" class="col-6 col-md-3">
            <q-btn color="deep-purple" icon="payments" label="Tunggakan" :to="{ name: 'proctor-tunggakan' }"
              class="full-width" no-caps unelevated />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Kelas Binaan (Wali Kelas Only) -->
    <q-card v-if="isHomeroomTeacher" flat bordered class="q-mb-md bg-indigo-1">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <q-icon name="groups" color="indigo" size="sm" class="q-mr-xs" />
          <div class="text-subtitle2 text-weight-bold">
            Kelas Binaan: {{ homeroomClass?.name || '-' }}
          </div>
          <q-space />
          <q-badge color="indigo" label="Wali Kelas" />
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-md-6">
            <q-btn color="deep-purple" icon="payments" label="Lihat Tunggakan Kelas" :to="{ name: 'proctor-tunggakan' }"
              class="full-width" no-caps outline />
          </div>
          <div class="col-12 col-md-6">
            <q-btn color="indigo" icon="checklist" label="Peserta & Non-Peserta Ujian"
              :to="{ name: 'proctor-peserta-kelas' }" class="full-width" no-caps outline />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Sesi Ujian -->
    <div class="text-subtitle1 text-weight-bold q-mb-sm">
      <q-icon name="event" color="primary" class="q-mr-xs" />
      Sesi Ujian yang Ditugaskan
    </div>

    <q-card v-if="!sessions.length && !loading" flat bordered>
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
            <div class="row items-start no-wrap">
              <div class="col">
                <div class="text-h6">{{ s.exam_title }}</div>
                <div class="text-caption text-grey-7">
                  {{ s.session_type }} · {{ formatRange(s.start_time, s.end_time) }}
                </div>
              </div>
              <q-badge :color="statusColor(s.status)" :label="s.status" />
            </div>
            <div class="q-mt-md">
              <q-icon name="group" size="sm" />
              <span class="q-ml-xs">{{ s.student_count }} peserta</span>
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
import { ref, computed, onMounted } from 'vue'
import { ProctorDashboardService } from '@/services/proctor/ProctorDashboardService'
import { useProctorProfile } from '@/composables/proctor/useProctorProfile'

const loading = ref(false)
const sessions = ref([])

const {
  fetchProfile,
  profile,
  isHomeroomTeacher,
  homeroomClass,
  teachingSubjects,
} = useProctorProfile()

// ── Computed
const activeSessionCount = computed(
  () => sessions.value.filter((s) => s.status === 'ACTIVE').length,
)

// ── Load data (parallel)
const load = async () => {
  loading.value = true
  try {
    const [, sessionsRes] = await Promise.all([
      fetchProfile(),
      ProctorDashboardService.listSessions(),
    ])

    const data = sessionsRes?.data?.data
    sessions.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[ProctorDashboard] load:', e)
    sessions.value = []
  } finally {
    loading.value = false
  }
}

// ── Presentation helpers
const formatRange = (start, end) => {
  const f = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
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

<style scoped>
.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
