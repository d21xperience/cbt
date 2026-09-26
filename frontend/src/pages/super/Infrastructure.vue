<template>
  <q-page padding class="bg-grey-1">
    <!-- Header -->
    <div class="q-mb-md row justify-between items-center">
      <div>
        <h5 class="q-my-none text-weight-bold text-primary">Monitoring Infrastruktur</h5>
        <div class="text-caption text-grey-7">
          Kelola sewa VPS, domain, dan sertifikat TLS. Auto-fetch dari vendor API akan hadir di proyek berikutnya.
        </div>
      </div>
      <q-btn outline color="primary" icon="refresh" label="Segarkan" :loading="anyLoading" @click="loadAll" />
    </div>

    <!-- Error state banner -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Endpoint monitoring infrastruktur belum tersedia di backend (VER-013 pending).
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

    <!-- Auto-fetch Placeholder Banner -->
    <q-banner dense rounded class="bg-indigo-1 text-indigo-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="auto_awesome" color="indigo" />
      </template>
      <div class="row items-center">
        <div class="col">
          <b>Auto-fetch dari vendor API:</b> sinkronisasi otomatis dari DigitalOcean, Cloudflare, Let's
          Encrypt akan hadir di proyek berikutnya.
        </div>
      </div>
    </q-banner>

    <!-- Tabs -->
    <q-tabs v-model="tab" dense align="left" class="q-mb-md bg-white text-primary rounded-borders"
      active-color="primary" indicator-color="primary" flat bordered>
      <q-tab name="vps" label="VPS" icon="dns" />
      <q-tab name="domains" label="Domain" icon="language" />
      <q-tab name="tls" label="Sertifikat TLS" icon="lock" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <!-- ═══════════ TAB 1: VPS ═══════════ -->
      <q-tab-panel name="vps" class="q-pa-none">
        <SummaryCards :summary="vpsSummary" />
        <ResourceTable :items="vps" :columns="vpsColumns" :loading="loading.vps" title="VPS Server"
          empty-label="Belum ada VPS tercatat" add-label="Tambah VPS" @add="openDialog('vps', null)"
          @edit="openDialog('vps', $event)" @delete="confirmDelete('vps', $event)" />
      </q-tab-panel>

      <!-- ═══════════ TAB 2: DOMAIN ═══════════ -->
      <q-tab-panel name="domains" class="q-pa-none">
        <SummaryCards :summary="domainsSummary" />
        <ResourceTable :items="domains" :columns="domainsColumns" :loading="loading.domains" title="Domain"
          empty-label="Belum ada domain tercatat" add-label="Tambah Domain" @add="openDialog('domains', null)"
          @edit="openDialog('domains', $event)" @delete="confirmDelete('domains', $event)" />
      </q-tab-panel>

      <!-- ═══════════ TAB 3: TLS ═══════════ -->
      <q-tab-panel name="tls" class="q-pa-none">
        <SummaryCards :summary="tlsSummary" />
        <ResourceTable :items="tlsCerts" :columns="tlsColumns" :loading="loading.tls" title="Sertifikat TLS"
          empty-label="Belum ada sertifikat TLS tercatat" add-label="Tambah Sertifikat" @add="openDialog('tls', null)"
          @edit="openDialog('tls', $event)" @delete="confirmDelete('tls', $event)" />
      </q-tab-panel>
    </q-tab-panels>

    <!-- Form Dialog -->
    <InfrastructureFormDialog v-model="dialogOpen" :resource-type="dialogResource" :edit-data="dialogEditData"
      :submitting="submitting" @submit="onFormSubmit" />
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useInfrastructure } from '@/composables/super/useInfrastructure'
import InfrastructureFormDialog from '@/components/superadmin/InfrastructureFormDialog.vue'
import SummaryCards from '@/components/superadmin/InfrastructureSummaryCards.vue'
import ResourceTable from '@/components/superadmin/InfrastructureTable.vue'

const $q = useQuasar()

const {
  vps,
  domains,
  tlsCerts,
  loading,
  submitting,
  errorState,
  loadVps,
  loadDomains,
  loadTls,
  loadAll,
  createResource,
  updateResource,
  deleteResource,
  // computeExpiryStatus,
  summaryOf,
} = useInfrastructure()

// ── UI state
const tab = ref('vps')
const dialogOpen = ref(false)
const dialogResource = ref('vps')
const dialogEditData = ref(null)

// ── Loading aggregator
const anyLoading = computed(
  () => loading.value.vps || loading.value.domains || loading.value.tls,
)

// ── Summary per resource
const vpsSummary = computed(() => summaryOf(vps.value))
const domainsSummary = computed(() => summaryOf(domains.value))
const tlsSummary = computed(() => summaryOf(tlsCerts.value))

// ── Formatters
// const formatRupiah = (v) => {
//   const n = Number(v)
//   if (!Number.isFinite(n)) return 'Rp -'
//   return `Rp ${n.toLocaleString('id-ID')}`
// }

// const formatDate = (v) => {
//   if (!v) return '-'
//   try {
//     return new Date(v).toLocaleDateString('id-ID', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     })
//   } catch {
//     return v
//   }
// }

// const expiryColor = (dateStr) => {
//   const { status } = computeExpiryStatus(dateStr)
//   if (status === 'expired') return 'negative'
//   if (status === 'expiring_soon') return 'warning'
//   if (status === 'active') return 'positive'
//   return 'grey'
// }

// const expiryLabel = (dateStr) => {
//   const { status, days_left } = computeExpiryStatus(dateStr)
//   if (status === 'expired') return `Expired ${Math.abs(days_left)} hari lalu`
//   if (status === 'expiring_soon') return `${days_left} hari lagi`
//   if (status === 'active') return `${days_left} hari`
//   return 'Unknown'
// }

// ── Columns per resource
const vpsColumns = [
  { name: 'vendor', label: 'Vendor', field: 'vendor', align: 'left', style: 'min-width: 140px' },
  { name: 'package', label: 'Paket', field: 'package', align: 'left', style: 'min-width: 140px' },
  { name: 'biaya', label: 'Biaya Bulanan', field: 'biaya_bulanan', align: 'right', style: 'width: 140px' },
  { name: 'tanggal_sewa', label: 'Tgl Sewa', field: 'tanggal_sewa', align: 'left', style: 'width: 120px' },
  { name: 'expiry', label: 'Expiry', align: 'left', style: 'width: 180px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 120px' },
]

const domainsColumns = [
  { name: 'domain', label: 'Domain', field: 'domain', align: 'left', style: 'min-width: 180px' },
  { name: 'registrar', label: 'Registrar', field: 'registrar', align: 'left', style: 'min-width: 140px' },
  { name: 'biaya', label: 'Biaya Tahunan', field: 'biaya_tahunan', align: 'right', style: 'width: 140px' },
  { name: 'tanggal_registrasi', label: 'Tgl Registrasi', field: 'tanggal_registrasi', align: 'left', style: 'width: 140px' },
  { name: 'expiry', label: 'Expiry', align: 'left', style: 'width: 180px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 120px' },
]

const tlsColumns = [
  { name: 'domain', label: 'Domain', field: 'domain', align: 'left', style: 'min-width: 180px' },
  { name: 'issuer', label: 'Issuer', field: 'issuer', align: 'left', style: 'min-width: 140px' },
  { name: 'tipe', label: 'Tipe', field: 'tipe', align: 'center', style: 'width: 110px' },
  { name: 'tanggal_issue', label: 'Tgl Issue', field: 'tanggal_issue', align: 'left', style: 'width: 120px' },
  { name: 'expiry', label: 'Expiry', align: 'left', style: 'width: 180px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 120px' },
]

// ── Dialog handlers
const openDialog = (resource, editData) => {
  dialogResource.value = resource
  dialogEditData.value = editData
  dialogOpen.value = true
}

const reloadFor = (resource) => {
  if (resource === 'vps') return loadVps
  if (resource === 'domains') return loadDomains
  if (resource === 'tls') return loadTls
  return loadAll
}

const onFormSubmit = async (formData) => {
  const resource = dialogResource.value
  const reloadFn = reloadFor(resource)

  const result = dialogEditData.value?.id
    ? await updateResource(resource, dialogEditData.value.id, formData, reloadFn)
    : await createResource(resource, formData, reloadFn)

  if (result.success) {
    dialogOpen.value = false
    dialogEditData.value = null
  }
}

const confirmDelete = (resource, row) => {
  const label =
    row.vendor || row.package || row.domain || row.issuer || row.id || 'item ini'

  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus <b>${label}</b>?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    const reloadFn = reloadFor(resource)
    await deleteResource(resource, row.id, reloadFn)
  })
}

// ── Helper exposure to template
defineExpose({
  // not needed, but keep structure
})
</script>
