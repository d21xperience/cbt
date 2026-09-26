<template>
  <q-page padding class="bg-grey-1">
    <!-- Header -->
    <div class="q-mb-md row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">
          Layanan Purna Jual
        </h5>
        <div class="text-caption text-grey-7">
          Log komunikasi WhatsApp dengan sekolah. Integrasi AI akan tersedia di proyek berikutnya.
        </div>
      </div>
      <q-btn color="primary" icon="add_comment" label="Catat Komunikasi" no-caps @click="openCreateDialog" />
    </div>

    <!-- Error state banner -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Endpoint log purna jual belum tersedia di backend (VER-012 pending).
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

    <q-banner v-else-if="errorState === 'contract_mismatch'" dense rounded class="bg-purple-1 text-purple-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="report" color="purple" />
      </template>
      Response backend tidak sesuai kontrak.
    </q-banner>

    <!-- AI Placeholder Banner -->
    <q-banner dense rounded class="bg-indigo-1 text-indigo-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="auto_awesome" color="indigo" />
      </template>
      <div class="row items-center">
        <div class="col">
          <b>Integrasi AI:</b> Respons otomatis pertanyaan umum sekolah akan hadir di proyek
          berikutnya.
        </div>
        <q-btn flat dense label="Detail" color="indigo" to="#" disable />
      </div>
    </q-banner>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Total</div>
            <div class="text-h5 text-weight-bold">{{ stats.total }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="bg-orange-1 text-orange-9">
          <q-card-section class="text-center">
            <div class="text-caption">Pending</div>
            <div class="text-h5 text-weight-bold">{{ stats.pending }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="bg-blue-1 text-blue-9">
          <q-card-section class="text-center">
            <div class="text-caption">Replied</div>
            <div class="text-h5 text-weight-bold">{{ stats.replied }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="bg-green-1 text-green-9">
          <q-card-section class="text-center">
            <div class="text-caption">Resolved</div>
            <div class="text-h5 text-weight-bold">{{ stats.resolved }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md bg-white">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-input v-model="searchQuery" placeholder="Cari sekolah, no. HP, atau pesan..." outlined dense clearable>
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-4">
          <q-select v-model="directionFilter" :options="directionOptions" label="Arah Komunikasi" outlined dense
            emit-value map-options />
        </div>
        <div class="col-6 col-sm-4">
          <q-select v-model="statusFilter" :options="statusOptions" label="Status" outlined dense emit-value
            map-options />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered class="bg-white">
      <q-table :rows="filteredLogs" :columns="columns" row-key="id" flat :loading="loading"
        no-data-label="Belum ada log komunikasi">
        <template v-slot:body-cell-direction="props">
          <q-td :props="props" class="text-center">
            <q-chip dense :color="props.row.direction === 'INBOUND' ? 'blue-6' : 'teal-6'" text-color="white"
              :icon="props.row.direction === 'INBOUND' ? 'call_received' : 'call_made'"
              :label="props.row.direction === 'INBOUND' ? 'MASUK' : 'KELUAR'" />
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-chip dense :color="getStatusColor(props.row.status)" text-color="white" :label="props.row.status" />
          </q-td>
        </template>

        <template v-slot:body-cell-message="props">
          <q-td :props="props">
            <div style="
                max-width: 320px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              ">
              {{ props.row.message }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center" style="white-space: nowrap">
            <q-btn flat round dense icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Edit / Update Status</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
              <q-tooltip>Hapus Log</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Create / Edit -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="width: 600px; max-width: 95vw">
        <q-card-section class="bg-primary text-white row items-center">
          <div class="text-h6">{{ isEditing ? 'Edit Log Komunikasi' : 'Catat Komunikasi Baru' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-md q-pt-md">
          <q-select v-model="form.school_name" :options="schoolOptions" label="Sekolah" outlined dense use-input
            input-debounce="200" emit-value map-options :rules="[(v) => !!v || 'Sekolah wajib dipilih']"
            @filter="onFilterSchool" />

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.contact_phone" label="No. HP / WhatsApp" outlined dense mask="#############"
                unmasked-value :rules="phoneRules" hint="Format: angka 10-13 digit, tanpa spasi/dash" />
            </div>
            <div class="col-12 col-sm-6">
              <q-select v-model="form.direction" :options="directionOptions.filter((o) => o.value !== 'ALL')"
                label="Arah Komunikasi" outlined dense emit-value map-options />
            </div>
          </div>

          <q-input v-model="form.message" type="textarea" label="Pesan / Catatan" outlined autogrow
            :rules="[(v) => !!v || 'Pesan wajib diisi']" />

          <q-select v-model="form.status" :options="statusOptions.filter((o) => o.value !== 'ALL')" label="Status"
            outlined dense emit-value map-options />

          <q-input v-model="form.admin_notes" type="textarea" label="Catatan Internal (opsional)" outlined autogrow
            :rows="2" />
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-pr-md">
          <q-btn flat label="Batal" v-close-popup color="grey-7" />
          <q-btn color="primary" :label="isEditing ? 'Simpan Perubahan' : 'Simpan'" :loading="submitting"
            @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useServiceAfterSales } from '@/composables/super/useServiceAfterSales'
import { useSuperAdminStore } from '@/stores/super/superTenant'

const $q = useQuasar()
const store = useSuperAdminStore()

const {
  // logs,
  loading,
  submitting,
  errorState,
  searchQuery,
  directionFilter,
  statusFilter,
  filteredLogs,
  stats,
  createLog,
  updateLog,
  deleteLog,
  getSchoolPhoneByName,
} = useServiceAfterSales()

// ── Table columns (presentation)
const columns = [
  { name: 'timestamp', label: 'Waktu', field: 'timestamp', align: 'left', style: 'width: 150px' },
  { name: 'school_name', label: 'Sekolah', field: 'school_name', align: 'left', style: 'min-width: 180px' },
  { name: 'contact_phone', label: 'No. HP', field: 'contact_phone', align: 'left', style: 'width: 140px' },
  { name: 'direction', label: 'Arah', field: 'direction', align: 'center', style: 'width: 100px' },
  { name: 'message', label: 'Pesan', field: 'message', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center', style: 'width: 120px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 120px' },
]

// ── Filter options
const directionOptions = [
  { label: 'Semua Arah', value: 'ALL' },
  { label: 'Masuk (dari sekolah)', value: 'INBOUND' },
  { label: 'Keluar (ke sekolah)', value: 'OUTBOUND' },
]

const statusOptions = [
  { label: 'Semua Status', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Replied', value: 'REPLIED' },
  { label: 'Resolved', value: 'RESOLVED' },
]

// ── Dialog state
const dialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const schoolFilter = ref('')

const buildInitialForm = () => ({
  school_name: '',
  contact_phone: '',
  direction: 'INBOUND',
  message: '',
  status: 'PENDING',
  admin_notes: '',
})

const form = ref(buildInitialForm())

// ── School options (dari store, real-time)
const schoolOptions = computed(() => {
  const list = Array.isArray(store.schools) ? store.schools : []
  const q = schoolFilter.value.trim().toLowerCase()

  return list
    .filter((s) => {
      if (!q) return true
      return (
        String(s.school_name || '').toLowerCase().includes(q) ||
        String(s.slug || '').toLowerCase().includes(q)
      )
    })
    .map((s) => ({
      label: s.school_name || s.slug,
      value: s.school_name || s.slug,
    }))
})

const onFilterSchool = (val, update) => {
  update(() => {
    schoolFilter.value = val
  })
}

// ── Presentation helpers
const getStatusColor = (status) => {
  switch (status) {
    case 'PENDING':
      return 'orange-8'
    case 'REPLIED':
      return 'blue-7'
    case 'RESOLVED':
      return 'green-7'
    default:
      return 'grey-6'
  }
}

// ── Dialog actions
const openCreateDialog = () => {
  isEditing.value = false
  editingId.value = null
  form.value = buildInitialForm()
  dialogOpen.value = true
}

const openEditDialog = (row) => {
  isEditing.value = true
  editingId.value = row.id
  form.value = {
    school_name: row.school_name || '',
    contact_phone: row.contact_phone || '',
    direction: row.direction || 'INBOUND',
    message: row.message || '',
    status: row.status || 'PENDING',
    admin_notes: row.admin_notes || '',
  }
  dialogOpen.value = true
}

const submitForm = async () => {
  // Validasi minimal
  if (!form.value.school_name || !form.value.message || !form.value.contact_phone) {
    $q.notify({ type: 'warning', message: 'Lengkapi field wajib.' })
    return
  }

  const result = isEditing.value
    ? await updateLog(editingId.value, form.value)
    : await createLog(form.value)

  if (result.success) {
    dialogOpen.value = false
  }
}

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus log komunikasi dengan <b>${row.school_name}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteLog(row.id)
  })
}
// ── Auto-fill phone ketika sekolah dipilih
watch(
  () => form.value.school_name,
  (newSchool) => {
    if (!newSchool) return
    const phone = getSchoolPhoneByName(newSchool, store.schools)
    // Hanya overwrite kalau user belum ubah manual
    // (heuristic: overwrite jika kosong atau masih sama dengan tenant sebelumnya)
    if (phone && (!form.value.contact_phone || form.value.contact_phone.length < 8)) {
      form.value.contact_phone = phone
    }
  },
)
// Refresh school list saat dialog buka (untuk pastikan data terbaru)
watch(dialogOpen, (val) => {
  if (val && (!store.schools || store.schools.length === 0)) {
    store.getSchoolsAction()
  }
})
// ── Validasi phone: hanya angka, 10-13 digit
const phoneRules = [
  (v) => !!v || 'No. HP wajib',
  (v) => /^\d{10,13}$/.test(String(v || '')) || 'Harus 10-13 digit angka',
]
</script>
