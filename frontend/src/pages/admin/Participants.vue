<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="text-h4 col">
        <q-icon name="group" color="primary" size="md" class="q-mr-sm" />
        Data Peserta
      </div>
    </div>

    <!-- Error banner -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Endpoint data peserta belum tersedia di backend (Phase 6). Menampilkan data mock.
    </q-banner>
    <q-banner v-else-if="errorState === 'network_error'" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="wifi_off" color="orange" />
      </template>
      Koneksi terputus. Data terakhir tetap ditampilkan.
    </q-banner>
    <q-banner v-else-if="errorState === 'server_error'" dense rounded class="bg-red-1 text-red-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="error" color="red" />
      </template>
      Server error. Klik refresh untuk coba lagi.
    </q-banner>

    <!-- Filter -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row">
          <div class="col-12">
            <q-input v-model="filterSearch" label="Cari Nama / NIS / NISN" outlined dense clearable>
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </div>
        <div class="text-caption text-grey-7 q-mt-sm">
          Menampilkan <b>{{ filteredParticipants.length }}</b> dari
          {{ participants.length }} peserta
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card>
      <q-table :rows="filteredParticipants" :columns="columns" row-key="id" flat bordered :loading="loading"
        no-data-label="Belum ada data peserta">
        <template v-slot:body-cell-nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.nama || '-' }}</div>
            <div class="text-caption text-grey-6">
              NISN: {{ props.row.nisn || '-' }}
              <span v-if="props.row.nis"> · NIS: {{ props.row.nis }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-kelas_nama="props">
          <q-td :props="props">
            <q-chip dense outline color="blue" icon="school" size="sm">
              {{ props.row.kelas_nama || '-' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-exam_password="props">
          <q-td :props="props" class="text-center">
            <q-btn flat dense size="sm" color="primary" :icon="shownPwd[props.row.id] ? 'visibility_off' : 'visibility'"
              @click="togglePwd(props.row.id)">
              <q-tooltip>{{ shownPwd[props.row.id] ? 'Sembunyikan' : 'Tampilkan' }}</q-tooltip>
            </q-btn>
            <code v-if="shownPwd[props.row.id]" class="q-ml-sm text-primary">
              {{ props.row.exam_password || '-' }}
            </code>
            <code v-else class="q-ml-sm">••••••</code>
          </q-td>
        </template>


        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat round dense icon="lock_reset" color="orange" @click="confirmReset(props.row)">
              <q-tooltip>Reset password</q-tooltip>
            </q-btn>
            <q-btn v-if="props.row.source === 'EXTERNAL'" flat round dense icon="delete" color="negative"
              @click="confirmDelete(props.row)">
              <q-tooltip>Hapus peserta</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Import Dialog -->

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useParticipants } from '@/composables/admin/useParticipants'

const $q = useQuasar()

const {
  participants,
  loading,
  errorState,
  filterSearch,
  filteredParticipants,
  resetPassword,
} = useParticipants()

const shownPwd = ref({})
const togglePwd = (id) => {
  shownPwd.value = { ...shownPwd.value, [id]: !shownPwd.value[id] }
}

const columns = [
  { name: 'nama', label: 'Nama / NISN', field: 'nama', align: 'left', style: 'min-width: 200px' },
  { name: 'kelas_nama', label: 'Kelas', field: 'kelas_nama', align: 'left', style: 'width: 140px' },
  { name: 'exam_password', label: 'Password', field: 'exam_password', align: 'center', style: 'min-width: 160px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 110px' },
]

const confirmReset = (row) => {
  $q.dialog({
    title: 'Reset Password',
    message: `Reset password untuk <b>${row.nama}</b>? Password baru akan di-generate otomatis.`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Reset', color: 'orange', flat: true },
    persistent: true,
  }).onOk(async () => {
    const newPwd = await resetPassword(row)
    if (newPwd) {
      shownPwd.value = { ...shownPwd.value, [row.id]: true }
      $q.notify({
        type: 'positive',
        message: `Password baru: ${newPwd}`,
        timeout: 8000,
        actions: [
          {
            label: 'Copy',
            color: 'white',
            handler: () => {
              navigator.clipboard?.writeText(newPwd)
              $q.notify({ type: 'info', message: 'Password dicopy.' })
            },
          },
        ],
      })
    }
  })
}
</script>
