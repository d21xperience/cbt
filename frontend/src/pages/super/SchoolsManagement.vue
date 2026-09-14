<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <h5 class="q-my-none text-weight-bold">Registrasi & Kontrol Sekolah</h5>
        <div class="text-caption text-grey-7">Kelola kuota server, pembatasan beban sinkronisasi Dapodik, dan fitur SaaS
          tingkat lanjut.</div>
      </div>
      <q-btn color="primary" icon="add" label="Daftarkan Sekolah Baru" @click="openDialog()" />
    </div>

    <!-- Tabel Data Utama Tenant -->
    <q-table :rows="store.schools" :columns="columns" row-key="id" flat bordered>
      <!-- Slot Kolom Kuota -->
      <template v-slot:body-cell-kuota="props">
        <q-td :props="props">
          <q-chip dense outline color="orange" icon="people">
            {{ props.row.max_participants || props.row.max_active_students || 500 }} Siswa
          </q-chip>
        </q-td>
      </template>

      <!-- Slot Kolom Kontrol Gatekeeper Sync -->
      <template v-slot:body-cell-sync="props">
        <q-td :props="props" class="text-center">
          <q-btn dense :color="props.row.sync_locked ? 'red-5' : 'green-5'"
            :icon="props.row.sync_locked ? 'lock' : 'lock_open'" :label="props.row.sync_locked ? 'Locked' : 'Allowed'"
            @click="toggleSyncLock(props.row)">
            <q-tooltip>Kunci akses sinkronisasi database lokal sekolah</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- Slot Aksi Operasional & Konfigurasi -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs text-center">
          <!-- Tombol Pemicu Konfigurasi SaaS Tingkat Lanjut -->
          <q-btn flat round dense color="indigo-9" icon="settings" @click="openSaasConfig(props.row.id)">
            <q-tooltip>Konfigurasi Fitur & Domain SaaS</q-tooltip>
          </q-btn>

          <q-btn flat round dense color="primary" icon="edit" @click="openDialog(props.row)" />
          <q-btn flat round dense color="negative" icon="block" @click="suspendSchool(props.row.id)" />
        </q-td>
      </template>
    </q-table>

    <!-- Dialog Registrasi / Edit Dasar Sekolah -->
    <school-form-dialog v-model="dialogOpen" :edit-data="selectedSchool" @saved="store.getSchoolsAction()" />

    <!-- Dialog Interaktif Konfigurasi SaaS Tingkat Lanjut -->
    <saas-config-dialog v-model="saasDialogOpen" :school-id="selectedSchoolId" @success="store.getSchoolsAction()" />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSuperAdminStore } from '@/stores/super/superTenant'
import { useQuasar } from 'quasar'

// Impor komponen dialog dasar dan dialog SaaS tingkat lanjut
import SchoolFormDialog from '@/components/superadmin/SchoolFormDialog.vue'
import SaasConfigDialog from '@/components/superadmin/SaasConfigDialog.vue'

const $q = useQuasar()
const store = useSuperAdminStore()

// State Manajemen Dialog
const dialogOpen = ref(false)
const saasDialogOpen = ref(false)
const selectedSchool = ref(null)
const selectedSchoolId = ref('')

const columns = [
  { name: 'npsn', label: 'NPSN', field: 'npsn', align: 'left' },
  { name: 'nama', label: 'Nama Sekolah', field: 'nama', align: 'left' },
  { name: 'kuota', label: 'Batas Kuota', align: 'left' },
  { name: 'sync', label: 'Izin Sync Dapodik', align: 'center' },
  { name: 'actions', label: 'Aksi & Pengaturan', align: 'center' }
]

// Fungsi membuka konfigurasi SaaS per baris sekolah
const openSaasConfig = (schoolId) => {
  selectedSchoolId.value = schoolId
  saasDialogOpen.value = true
}

const openDialog = (data = null) => {
  selectedSchool.value = data
  dialogOpen.value = true
}

const toggleSyncLock = async (school) => {
  try {
    await store.updateSchoolSyncLock(school.id, !school.sync_locked)
    $q.notify({ type: 'positive', message: `Izin sinkronisasi ${school.nama} diperbarui.` })
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Gagal mengubah status sinkronisasi.' })
  }
}

const suspendSchool = (schoolId) => {
  $q.dialog({
    title: `Tangguhkan Tenant ${schoolId}`,
    message: 'Apakah Anda yakin ingin menonaktifkan seluruh akses ujian sekolah ini sementara waktu?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    $q.notify({ type: 'warning', message: 'Akses sekolah berhasil ditangguhkan.' })
  })
}

onMounted(() => {
  store.getSchoolsAction()
})
</script>
