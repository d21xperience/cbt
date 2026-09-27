<!-- src/components/admin/ExamScheduleSubjectTable.vue -->
<template>
  <q-table :rows="rows" :columns="columns" row-key="_key" flat bordered dense hide-pagination
    :pagination="{ rowsPerPage: 0 }">
    <template #body-cell-subject_nama="props">
      <q-td :props="props">
        <div class="text-weight-medium">{{ props.row.subject_nama }}</div>
        <div class="text-caption text-grey-7">{{ props.row.subject_kode }}</div>
      </q-td>
    </template>
    <template #body-cell-tanggal="props">
      <q-td :props="props">
        <q-input v-model="props.row.tanggal" type="date" dense outlined />
      </q-td>
    </template>
    <template #body-cell-jam_mulai="props">
      <q-td :props="props">
        <q-input v-model="props.row.jam_mulai" type="time" dense outlined />
      </q-td>
    </template>
    <template #body-cell-durasi_menit="props">
      <q-td :props="props">
        <q-input v-model.number="props.row.durasi_menit" type="number" dense outlined suffix="mnt" />
      </q-td>
    </template>
    <template #body-cell-end="props">
      <q-td :props="props" class="text-indigo text-weight-medium">
        {{ getEndTime(props.row) }}
      </q-td>
    </template>
  </q-table>
</template>

<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
  getEndTime: { type: Function, default: () => '--:--' },
})

const columns = [
  { name: 'subject_nama', label: 'Mata Pelajaran', field: 'subject_nama', align: 'left' },
  { name: 'tanggal', label: 'Tanggal', field: 'tanggal', align: 'left', style: 'width: 170px' },
  { name: 'jam_mulai', label: 'Jam Mulai', field: 'jam_mulai', align: 'left', style: 'width: 130px' },
  { name: 'durasi_menit', label: 'Durasi', field: 'durasi_menit', align: 'left', style: 'width: 120px' },
  { name: 'end', label: 'Selesai', align: 'left', style: 'width: 90px' },
]
</script>
