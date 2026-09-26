<template>
  <q-page padding>
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div>
        <h5 class="q-my-none text-weight-bold">Registrasi & Kontrol Sekolah</h5>
        <div class="text-caption text-grey-7">
          Kelola kuota server, pembatasan beban sinkronisasi Dapodik, dan fitur SaaS tingkat lanjut.
        </div>
      </div>
      <q-btn color="primary" icon="add" label="Daftarkan Sekolah Baru" @click="openDialog()" />
    </div>
    <!-- Table -->
    <q-table :rows="store.schools" :columns="columns" row-key="id" flat bordered :table-row-class-fn="rowClass">
      <template v-slot:body-cell-npsn="props">
        <q-td :props="props">
          {{ props.row.npsn }}
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip v-if="props.row.is_suspended" dense color="red-7" text-color="white" icon="block">
            SUSPENDED
          </q-chip>
          <q-chip v-else-if="props.row.is_active === false" dense color="grey-6" text-color="white" icon="pause_circle">
            INACTIVE
          </q-chip>
          <q-chip v-else dense color="green-6" text-color="white" icon="check_circle">
            ACTIVE
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-package="props">
        <q-td :props="props">
          <div class="column q-gutter-xs">
            <q-chip dense :color="tierColor(props.row.package_tier)" text-color="white"
              :icon="tierIcon(props.row.package_tier)" class="text-weight-bold">
              {{ (props.row.package_tier || 'BASIC') }}
            </q-chip>
            <q-chip dense outline :color="props.row.billing_type === 'MONTHLY' ? 'indigo' : 'teal'"
              :icon="props.row.billing_type === 'MONTHLY' ? 'event_repeat' : 'quiz'">
              {{ props.row.billing_type === 'MONTHLY' ? 'Bulanan' : 'Per Ujian' }}
            </q-chip>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-kuota="props">
        <q-td :props="props">
          <q-chip dense outline color="orange" icon="people">
            {{ props.row.max_participants || 500 }} Siswa
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-sync="props">
        <q-td :props="props" class="text-center">
          <q-btn dense :color="props.row.sync_locked ? 'red-5' : 'green-5'"
            :icon="props.row.sync_locked ? 'lock' : 'lock_open'" :label="props.row.sync_locked ? 'Locked' : 'Allowed'"
            @click="toggleSyncLock(props.row)">
            <q-tooltip>Kunci akses sinkronisasi database lokal sekolah</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs text-center">
          <q-btn flat round dense color="indigo-9" icon="settings" @click="openSaasConfig(props.row)">
            <q-tooltip>Konfigurasi Fitur & Domain SaaS</q-tooltip>
          </q-btn>
          <q-btn flat round dense color="primary" icon="edit" @click="openDialog(props.row)" />
          <!-- Suspend / Unsuspend dinamis -->
          <q-btn v-if="!props.row.is_suspended" flat round dense color="negative" icon="block"
            @click="suspendSchool(props.row)">
            <q-tooltip>Tangguhkan akses sekolah</q-tooltip>
          </q-btn>
          <q-btn v-else flat round dense color="positive" icon="check_circle" @click="unsuspendSchool(props.row)">
            <q-tooltip>Aktifkan kembali sekolah</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
    <!-- Dialogs -->
    <school-form-dialog v-model="dialogOpen" :edit-data="selectedSchool" @saved="store.getSchoolsAction()" />

    <saas-config-dialog v-model="saasDialogOpen" :school-id="selectedSchoolId" @success="store.getSchoolsAction()" />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSuperAdminStore } from '@/stores/super/superTenant'
import { useQuasar } from 'quasar'
import SchoolFormDialog from '@/components/superadmin/SchoolFormDialog.vue'
import SaasConfigDialog from '@/components/superadmin/SaasConfigDialog.vue'

const $q = useQuasar()
const store = useSuperAdminStore()

const dialogOpen = ref(false)
const saasDialogOpen = ref(false)
const selectedSchool = ref(null)
const selectedSchoolId = ref('')

const columns = [
  { name: 'npsn', label: 'NPSN', field: 'npsn', align: 'left', style: 'width: 110px' },
  { name: 'nama', label: 'Nama Sekolah', field: 'school_name', align: 'left', style: 'min-width: 200px' },
  { name: 'status', label: 'Status', align: 'center', style: 'width: 130px' },
  { name: 'package', label: 'Paket', align: 'left', style: 'min-width: 160px' },   // ← BARU
  { name: 'kuota', label: 'Kuota', align: 'left', style: 'width: 130px' },
  { name: 'sync', label: 'Izin Sync', align: 'center', style: 'width: 140px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 180px' },
]
const openSaasConfig = (school) => {
  selectedSchoolId.value = school.slug
  saasDialogOpen.value = true
}

const openDialog = (data = null) => {
  selectedSchool.value = data
  dialogOpen.value = true
}

const toggleSyncLock = async (school) => {
  try {
    await store.updateSchoolSyncLock(school.id, !school.sync_locked)
    // FIX B6: field `school_name`, bukan `nama`
    $q.notify({
      type: 'positive',
      message: `Izin sinkronisasi ${school.school_name} diperbarui.`,
    })
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Gagal mengubah status sinkronisasi.' })
  }
}

const suspendSchool = (row) => {
  $q.dialog({
    title: `Tangguhkan Tenant ${row.school_name || row.id}`,
    message: `Alasan penangguhan untuk <b>${row.school_name}</b>:`,
    html: true,
    prompt: {
      model: '',
      type: 'textarea',
      placeholder: 'Minimal 5 karakter',
      isValid: (val) => val && val.trim().length >= 5,
    },
    cancel: true,
    persistent: true,
  }).onOk(async (reason) => {
    try {
      await store.suspendSchool(row.id, reason.trim())
      $q.notify({
        type: 'warning',
        icon: 'block',
        message: `${row.school_name} ditangguhkan.`,
      })
    } catch (err) {
      console.error('[SchoolsManagement] suspend error:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'Gagal menangguhkan sekolah.',
      })
    }
  })
}

const unsuspendSchool = (row) => {
  $q.dialog({
    title: 'Aktifkan Kembali',
    message: `Aktifkan kembali akses <b>${row.school_name}</b>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await store.unsuspendSchool(row.id, 'Reaktivasi manual')
      $q.notify({
        type: 'positive',
        icon: 'check_circle',
        message: `${row.school_name} diaktifkan kembali.`,
      })
    } catch (err) {
      console.error('[SchoolsManagement] unsuspend error:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'Gagal mengaktifkan sekolah.',
      })
    }
  })
}
// Visual styling untuk tenant suspended
const rowClass = (row) => {
  if (row.is_suspended) return 'row-suspended'
  if (row.is_active === false) return 'row-inactive'
  return ''
}
// ── Tier presentation helpers
const tierColor = (tier) => {
  switch (tier) {
    case 'PREMIUM': return 'deep-purple'
    case 'VIP': return 'indigo'
    case 'BASIC':
    default: return 'grey-7'
  }
}

const tierIcon = (tier) => {
  switch (tier) {
    case 'PREMIUM': return 'workspace_premium'
    case 'VIP': return 'star'
    case 'BASIC':
    default: return 'star_border'
  }
}
onMounted(() => {
  store.getSchoolsAction()
})
</script>
<style scoped>
.row-suspended {
  background-color: #ffebee !important;
  opacity: 0.85;
}

.row-suspended:hover {
  background-color: #ffcdd2 !important;
}

.row-inactive {
  background-color: #f5f5f5 !important;
  opacity: 0.7;
}

:deep(.row-suspended),
:deep(.row-suspended td) {
  background-color: #ffebee !important;
}

:deep(.row-suspended:hover),
:deep(.row-suspended:hover td) {
  background-color: #ffcdd2 !important;
}

:deep(.row-inactive),
:deep(.row-inactive td) {
  background-color: #f5f5f5 !important;
  opacity: 0.7;
}
</style>
