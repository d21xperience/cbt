<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="meeting_room" color="primary" size="sm" class="q-mr-sm" />
          Ruang Ujian
        </div>
        <div class="text-caption text-grey-7">
          Master data ruang untuk pelaksanaan ujian.
        </div>
      </div>
      <q-btn color="primary" icon="add" label="Tambah Ruang" no-caps @click="openCreateDialog" />
    </div>

    <!-- Filter -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input v-model="searchQuery" label="Cari nama / keterangan" outlined dense clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="filterGedung" :options="gedungOptions" label="Filter Gedung" outlined dense emit-value
            map-options clearable />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredRooms" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada ruang">
        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-lokasi="props">
          <q-td :props="props">
            <q-icon name="apartment" size="xs" color="grey-7" class="q-mr-xs" />
            {{ props.row.gedung || '-' }} • Lt. {{ props.row.lantai || '-' }}
          </q-td>
        </template>

        <template v-slot:body-cell-kapasitas="props">
          <q-td :props="props" class="text-center">
            <q-chip dense outline color="orange" icon="event_seat">
              {{ props.row.kapasitas || 0 }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-aktif="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.aktif ? 'positive' : 'grey'" :label="props.row.aktif ? 'Aktif' : 'Nonaktif'" />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center" style="white-space: nowrap">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
              <q-tooltip>Hapus</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Form Dialog -->
    <RoomFormDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm" :submitting="submitting"
      :gedung-options="gedungOptions" @submit="submitForm" />
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRoomManagement } from '@/composables/admin/useRoomManagement'
import RoomFormDialog from '@/components/admin/RoomFormDialog.vue'

const $q = useQuasar()

const {
  loading,
  searchQuery,
  filterGedung,
  dialogOpen,
  isEditing,
  initialForm,
  submitting,
  gedungOptions,
  filteredRooms,
  load,
  openCreateDialog,
  openEditDialog,
  submitForm,
  deleteRoom,
} = useRoomManagement()

const columns = [
  { name: 'nama', label: 'Nama Ruang', field: 'nama', align: 'left', style: 'min-width: 140px' },
  { name: 'lokasi', label: 'Lokasi', field: 'gedung', align: 'left', style: 'min-width: 200px' },
  { name: 'kapasitas', label: 'Kapasitas', field: 'kapasitas', align: 'center', style: 'width: 110px' },
  { name: 'keterangan', label: 'Keterangan', field: 'keterangan', align: 'left' },
  { name: 'aktif', label: 'Status', field: 'aktif', align: 'center', style: 'width: 100px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus ruang <b>${row.nama}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteRoom(row)
  })
}

onMounted(load)
</script>
