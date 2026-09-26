<template>
  <q-card flat bordered class="bg-white">
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-subtitle1 text-weight-bold col">
        <q-icon name="menu_book" color="primary" class="q-mr-xs" />
        Daftar Mata Pelajaran
      </div>
      <div class="row q-gutter-xs">
        <q-chip dense color="green-1" text-color="green-9">
          <q-icon name="check_circle" size="xs" class="q-mr-xs" />
          {{ stats.withQ }} sudah ada soal
        </q-chip>
        <q-chip dense color="grey-3" text-color="grey-8">
          <q-icon name="pending" size="xs" class="q-mr-xs" />
          {{ stats.withoutQ }} belum
        </q-chip>
      </div>
    </q-card-section>

    <q-table :rows="rows" :columns="columns" row-key="id" flat dense :loading="loading"
      no-data-label="Tidak ada mata pelajaran untuk kelas ini">
      <!-- Kode -->
      <template v-slot:body-cell-kode="props">
        <q-td :props="props">
          <q-badge color="primary" :label="props.row.kode" />
        </q-td>
      </template>

      <!-- Nama + Kelompok -->
      <template v-slot:body-cell-nama="props">
        <q-td :props="props">
          <div class="text-weight-medium">{{ props.row.nama }}</div>
          <q-chip dense size="sm" :color="kelompokColor(props.row.kelompok)" text-color="white" class="q-mt-xs">
            {{ props.row.kelompok }}
          </q-chip>
        </q-td>
      </template>

      <!-- Status -->
      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip v-if="props.row.has_questions" dense color="positive" text-color="white" icon="check_circle">
            {{ props.row.total_questions }} soal
          </q-chip>
          <q-chip v-else dense color="grey-4" text-color="grey-8" icon="radio_button_unchecked">
            Belum ada
          </q-chip>
        </q-td>
      </template>

      <!-- Aksi -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center" style="white-space: nowrap">
          <q-btn flat round dense color="primary" icon="edit" @click="$emit('edit', props.row)">
            <q-tooltip>Kelola Soal</q-tooltip>
          </q-btn>
          <q-btn flat round dense color="teal" icon="visibility" :disable="!props.row.has_questions"
            @click="$emit('preview', props.row)">
            <q-tooltip>Preview Soal</q-tooltip>
          </q-btn>
          <q-btn flat round dense color="negative" icon="delete" :disable="!props.row.has_questions"
            @click="$emit('delete', props.row)">
            <q-tooltip>Hapus Semua Soal</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-card>
</template>

<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
  loading: Boolean,
  stats: { type: Object, default: () => ({ total: 0, withQ: 0, withoutQ: 0 }) },
})
defineEmits(['edit', 'preview', 'delete'])

const columns = [
  { name: 'kode', label: 'Kode', field: 'kode', align: 'left', style: 'width: 130px' },
  { name: 'nama', label: 'Mata Pelajaran', field: 'nama', align: 'left', style: 'min-width: 220px' },
  { name: 'status', label: 'Status Soal', align: 'center', style: 'width: 160px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 160px' },
]

const kelompokColor = (k) => {
  if (k === 'WAJIB') return 'primary'
  if (k === 'PILIHAN') return 'teal'
  if (k === 'MULOK') return 'orange'
  if (k === 'KEJURUAN') return 'deep-purple'
  return 'grey'
}
</script>
