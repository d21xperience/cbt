<template>
  <q-page padding>
    <div class="row justify-between items-center q-mb-md">
      <div>
        <h5 class="q-my-none text-weight-bold">Antrian Persetujuan Sekolah</h5>
        <div class="text-caption text-grey-7">
          Sekolah yang mendaftar dan menunggu persetujuan Super Admin.
        </div>
      </div>
      <q-btn color="primary" icon="refresh" label="Refresh" :loading="loading" @click="loadPending" />
    </div>

    <q-table :rows="pendingList" :columns="columns" row-key="tenant_id" flat bordered :loading="loading">
      <template v-slot:body-cell-created_at="props">
        <q-td :props="props">{{ formatDate(props.row.created_at) }}</q-td>
      </template>

      <!-- <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs text-center">
          <q-btn color="positive" icon="check" label="Approve" :loading="approving === props.row.tenant_id"
            @click="onApprove(props.row)" />
          <q-btn color="negative" icon="close" label="Reject" :disable="approving === props.row.tenant_id"
            @click="onReject(props.row)" />
        </q-td>
      </template> -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center" style="white-space: nowrap">
          <q-btn dense color="positive" icon="check" label="Setujui" size="sm" class="q-mr-xs"
            :loading="approving === props.row.tenant_id" @click="onApprove(props.row)" />
          <q-btn dense color="negative" icon="close" label="Tolak" size="sm"
            :disable="approving === props.row.tenant_id" @click="onReject(props.row)" />
        </q-td>
      </template>

      <template v-slot:no-data>
        <div class="full-width text-center q-pa-xl">
          <q-icon name="inbox" size="xl" color="grey-4" />
          <div class="text-grey-6 q-mt-sm">
            Tidak ada sekolah yang menunggu persetujuan.
          </div>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'
import ApprovalResultDialog from '@/components/superadmin/ApprovalResultDialog.vue'

const $q = useQuasar()

const loading = ref(false)
const approving = ref(null)
const pendingList = ref([])

const columns = [
  { name: 'school_name', label: 'Nama Sekolah', field: 'school_name', align: 'left', sortable: true, style: 'min-width: 200px' },
  { name: 'npsn', label: 'NPSN', field: 'npsn', align: 'left', style: 'width: 110px' },
  { name: 'subdomain', label: 'Subdomain', field: 'subdomain', align: 'left', style: 'min-width: 150px' },
  { name: 'contact_email', label: 'Email Kontak', field: 'contact_email', align: 'left', style: 'min-width: 220px' },
  { name: 'created_at', label: 'Terdaftar', field: 'created_at', align: 'left', sortable: true, style: 'width: 150px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 200px' },
]

const formatDate = (val) => {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleString('id-ID')
  } catch {
    return val
  }
}

const loadPending = async () => {
  loading.value = true
  try {
    const res = await TenantService.getPendingSchools()
    pendingList.value = res?.data?.data || []
  } catch (err) {
    console.error('[SchoolsPending] load error:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Gagal memuat antrian sekolah.',
    })
    pendingList.value = []
  } finally {
    loading.value = false
  }
}

const onApprove = (row) => {
  $q.dialog({
    title: 'Konfirmasi Persetujuan',
    message: `Setujui pendaftaran <b>${row.school_name}</b> (${row.npsn})?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    approving.value = row.tenant_id
    try {
      const res = await TenantService.approveSchool(row.tenant_id)
      const data = res?.data?.data || {}

      $q.dialog({
        component: ApprovalResultDialog,
        componentProps: { data },
      })

      await loadPending()
    } catch (err) {
      console.error('[SchoolsPending] approve error:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'Gagal menyetujui sekolah.',
      })
    } finally {
      approving.value = null
    }
  })
}

const onReject = (row) => {
  $q.dialog({
    title: 'Tolak Pendaftaran',
    message: `Alasan penolakan untuk <b>${row.school_name}</b>:`,
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
      await TenantService.rejectSchool(row.tenant_id, reason.trim())
      $q.notify({ type: 'positive', message: 'Pendaftaran ditolak.' })
      await loadPending()
    } catch (err) {
      console.error('[SchoolsPending] reject error:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'Gagal menolak pendaftaran.',
      })
    }
  })
}

onMounted(loadPending)
</script>
