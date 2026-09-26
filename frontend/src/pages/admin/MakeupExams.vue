<template>
  <q-page padding>
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="event_repeat" color="primary" size="sm" class="q-mr-sm" />
          Ujian Susulan
        </div>
        <div class="text-caption text-grey-7">
          Monitoring siswa yang belum / sedang / sudah mengikuti ujian susulan.
        </div>
      </div>
      <q-btn flat icon="refresh" label="Refresh" no-caps :loading="loading" @click="loadItems" />
    </div>

    <!-- Error banner -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <!-- Stats -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Total Siswa</div>
            <div class="text-h5 text-weight-bold text-primary">{{ stats.total }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-grey-2">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Belum</div>
            <div class="text-h5 text-weight-bold text-grey-8">{{ stats.notStarted }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-orange-1">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Melaksanakan</div>
            <div class="text-h5 text-weight-bold text-orange-9">{{ stats.inProgress }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-green-1">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Selesai</div>
            <div class="text-h5 text-weight-bold text-positive">{{ stats.completed }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="searchQuery" label="Cari nama / NISN" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterStatus" :options="statusOptions" label="Status" outlined dense emit-value map-options
            clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterClass" :options="classOptions" label="Kelas" outlined dense emit-value map-options
            clearable />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterSubject" :options="subjectOptions" label="Mata Pelajaran" outlined dense emit-value
            map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredItems" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada siswa yang perlu ujian susulan">
        <template v-slot:body-cell-student_name="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.student_name }}</div>
            <div class="text-caption text-grey-6">NISN: {{ props.row.nisn || '-' }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-class_name="props">
          <q-td :props="props">
            <q-chip dense outline color="primary" icon="class">
              {{ props.row.class_name || '-' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-subject_nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.subject_nama || '-' }}</div>
            <div class="text-caption text-grey-6">{{ props.row.original_exam_nama || '' }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-chip dense :color="statusColor(props.row.status)" text-color="white" :icon="statusIcon(props.row.status)"
              class="text-weight-bold">
              {{ statusLabel(props.row.status) }}
            </q-chip>
            <div v-if="props.row.status === 'IN_PROGRESS' && props.row.started_at"
              class="text-caption text-grey-6 q-mt-xs">
              Mulai: {{ formatTime(props.row.started_at) }}
            </div>
            <div v-if="props.row.status === 'COMPLETED' && props.row.completed_at"
              class="text-caption text-grey-6 q-mt-xs">
              Selesai: {{ formatTime(props.row.completed_at) }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn v-if="props.row.status === 'NOT_STARTED'" color="primary" icon="play_arrow" label="Mulai" size="sm"
              no-caps @click="startMakeup(props.row)" />
            <q-btn v-else-if="props.row.status === 'IN_PROGRESS'" color="orange" icon="schedule" label="Monitoring"
              size="sm" no-caps outline @click="startMakeup(props.row)" />
            <span v-else class="text-caption text-grey-6">
              <q-icon name="check_circle" color="positive" size="xs" />
              Selesai
            </span>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { useMakeupExams } from '@/composables/admin/useMakeupExams'

const {
  loading,
  errorState,
  searchQuery,
  filterStatus,
  filterClass,
  filterSubject,
  filteredItems,
  statusOptions,
  classOptions,
  subjectOptions,
  stats,
  loadItems,
  startMakeup,
} = useMakeupExams()

const columns = [
  { name: 'student_name', label: 'Nama Siswa', field: 'student_name', align: 'left', style: 'min-width: 200px' },
  { name: 'class_name', label: 'Kelas', field: 'class_name', align: 'left', style: 'width: 130px' },
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left', style: 'min-width: 200px' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 180px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 160px' },
]

const statusColor = (s) => {
  if (s === 'NOT_STARTED') return 'grey-6'
  if (s === 'IN_PROGRESS') return 'orange-8'
  if (s === 'COMPLETED') return 'positive'
  return 'grey-5'
}

const statusIcon = (s) => {
  if (s === 'NOT_STARTED') return 'radio_button_unchecked'
  if (s === 'IN_PROGRESS') return 'schedule'
  if (s === 'COMPLETED') return 'check_circle'
  return 'help'
}

const statusLabel = (s) => {
  if (s === 'NOT_STARTED') return 'BELUM'
  if (s === 'IN_PROGRESS') return 'MELAKSANAKAN'
  if (s === 'COMPLETED') return 'SELESAI'
  return s
}

const formatTime = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  } catch { return iso }
}
</script>
