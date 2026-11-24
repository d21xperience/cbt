<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="calendar_month" color="primary" size="sm" class="q-mr-sm" />
          Manajemen Jadwal Ujian
        </div>
        <div class="text-caption text-grey-7">
          Pemetaan distribusi waktu ujian berdasarkan Pembelajaran.
        </div>
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Buat Jadwal Baru"
        no-caps
        @click="openCreateDialog()"
      />
    </div>

    <q-card flat bordered class="bg-white">
      <q-table
        :rows="schedules"
        :columns="columns"
        row-key="row => row.id || row.lesson_id"
        flat
        :loading="loading"
        no-data-label="Belum ada pembelajaran"
      >
        <template v-slot:body-cell-tanggal="props">
          <q-td :props="props">
            <span v-if="props.row.tanggal">{{ props.row.tanggal }}</span>
            <span v-else class="text-grey">-</span>
          </q-td>
        </template>
        <template v-slot:body-cell-jam_mulai="props">
          <q-td :props="props">
            <span v-if="props.row.jam_mulai">{{ props.row.jam_mulai }}</span>
            <span v-else class="text-grey">-</span>
          </q-td>
        </template>
        <template v-slot:body-cell-tingkat="props">
          <q-td :props="props" class="text-center">
            {{ props.row.tingkat }}
          </q-td>
        </template>
        <template v-slot:body-cell-subject_nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.subject_nama }}</div>
            <div class="text-caption text-grey-7">
              {{ props.row.jenis_ujian_kode ? props.row.jenis_ujian_kode : 'Belum dijadwalkan' }}
            </div>
          </q-td>
        </template>
        <template v-slot:body-cell-class_nama="props">
          <q-td :props="props">
            <q-chip dense outline color="primary" icon="class">{{ props.row.class_nama }}</q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-pengawas="props">
          <q-td :props="props">
            <div v-if="props.row.pengawas1_nama">1. {{ props.row.pengawas1_nama }}</div>
            <div v-if="props.row.pengawas2_nama">2. {{ props.row.pengawas2_nama }}</div>
            <div v-if="!props.row.pengawas1_nama && !props.row.pengawas2_nama" class="text-grey">
              -
            </div>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center" style="white-space: nowrap">
            <template v-if="!props.row.id">
              <q-btn
                flat
                round
                dense
                icon="add_circle"
                color="primary"
                @click="openCreateDialog(props.row)"
              >
                <q-tooltip>Buat Jadwal</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              <q-btn
                flat
                round
                dense
                icon="edit"
                color="primary"
                @click="openEditDialog(props.row)"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="confirmDelete(props.row)"
              />
            </template>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <ExamScheduleFormDialog
      v-model="dialogOpen"
      :is-editing="isEditing"
      :initial-form="initialForm"
      :submitting="submitting"
      :lesson-options="lessonOptions"
      :teacher-options="teacherOptions"
      :room-options="roomOptions"
      @submit="submitForm"
    />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import ExamScheduleFormDialog from '@/components/admin/ExamScheduleFormDialog.vue'
import { useExamSchedules } from '@/composables/admin/useExamSchedules'

const $q = useQuasar()
const {
  schedules,
  loading,
  lessonOptions,
  teacherOptions,
  roomOptions,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteSchedule,
} = useExamSchedules()

const columns = [
  { name: 'subject_nama', label: 'Mata Pelajaran & Jenis', align: 'left' },
  { name: 'tingkat', label: 'Tingkat', field: 'tingkat', align: 'center', style: 'width: 80px' },
  { name: 'class_nama', label: 'Kelas', align: 'left' },
  { name: 'tanggal', label: 'Tanggal', field: 'tanggal', align: 'left', style: 'width: 120px' },
  { name: 'jam_mulai', label: 'Jam', field: 'jam_mulai', align: 'left', style: 'width: 80px' },
  { name: 'pengawas', label: 'Pengawas', align: 'left' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 100px' },
]

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Hapus jadwal ujian untuk <b>${row.subject_nama}</b>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(() => deleteSchedule(row))
}
</script>
