<!-- src/components/superadmin/TenantProgramsTab.vue -->
<!--
  Super Admin UI: kelola Program Keahlian per tenant.
  VER-009 (2026-09-20): endpoint /super/schools/:tenant_id/programs/*
  - Pakai UUID tenant_id (konsisten approve/reject)
  - Master references dari /public/references/program-keahlian
  - Non-SMK: UI tetap terbuka, tapi ada warning banner
-->
<template>
  <div>
    <!-- Tenant selector -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-6">
            <q-select v-model="selectedTenantId" :options="tenantOptions" option-value="id" option-label="label"
              emit-value map-options outlined dense use-input input-debounce="200" label="Pilih Sekolah"
              :loading="loadingPrograms" @update:model-value="onTenantChange" @filter="onFilterTenant">
              <template v-slot:prepend>
                <q-icon name="domain" />
              </template>
            </q-select>
          </div>
          <div v-if="selectedTenantId" class="col-12 col-md-6">
            <q-chip dense color="primary" text-color="white" icon="school">
              {{ selectedTenantLabel }}
            </q-chip>
            <q-chip v-if="selectedTenantJenjang" dense outline color="indigo"
              :label="`Jenjang: ${selectedTenantJenjang}`" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Empty: no tenant selected -->
    <q-card v-if="!selectedTenantId" flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="touch_app" size="xl" />
        <div class="text-subtitle1 q-mt-md">Pilih sekolah di atas</div>
        <div class="text-caption">untuk mengelola program keahlian tenant.</div>
      </q-card-section>
    </q-card>

    <!-- Content: tenant selected -->
    <template v-else>
      <!-- Warning: non-SMK/MAK jenjang -->
      <q-banner v-if="selectedTenantJenjang && !isSmkLike" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
        <template v-slot:avatar>
          <q-icon name="warning" color="orange" />
        </template>
        Sekolah ini berjenjang <b>{{ selectedTenantJenjang }}</b> — biasanya tidak
        memiliki program keahlian (hanya SMK/MAK). Anda tetap dapat menambahkan
        jika memang diperlukan.
      </q-banner>

      <!-- Add program -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">
            <q-icon name="add_circle" color="primary" class="q-mr-xs" />
            Tambah Program Keahlian
          </div>
          <div class="row q-col-gutter-sm items-center">
            <div class="col-12 col-md-8">
              <q-select v-model="programToAdd" :options="availableMasterPrograms" option-value="id" option-label="label"
                emit-value map-options outlined dense use-input input-debounce="200" label="Cari program keahlian..."
                :loading="loadingMasters" :disable="loadingMasters || availableMasterPrograms.length === 0" :hint="availableMasterPrograms.length === 0 && !loadingMasters
                    ? 'Semua program sudah terpasang atau master kosong'
                    : ''
                  " @filter="onFilterProgram">
                <template v-slot:prepend>
                  <q-icon name="search" />
                </template>
              </q-select>
            </div>
            <div class="col-12 col-md-4">
              <q-btn color="primary" icon="add" label="Tambahkan" :disable="!programToAdd" :loading="assigning"
                class="full-width" @click="onAssign" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Assigned programs -->
      <q-card flat bordered>
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="text-subtitle2 col">
              <q-icon name="check_circle" color="positive" class="q-mr-xs" />
              Program Keahlian Terpasang ({{ assignedPrograms.length }})
            </div>
            <q-btn flat dense round icon="refresh" color="grey-7" :loading="loadingPrograms" @click="loadPrograms">
              <q-tooltip>Refresh</q-tooltip>
            </q-btn>
          </div>

          <q-table :rows="assignedPrograms" :columns="programColumns" row-key="id" flat dense :loading="loadingPrograms"
            no-data-label="Belum ada program keahlian untuk sekolah ini">
            <template v-slot:body-cell-kode="props">
              <q-td :props="props">
                <q-badge color="primary" :label="props.row.kode || '-'" />
              </q-td>
            </template>

            <template v-slot:body-cell-bidang="props">
              <q-td :props="props">
                {{ props.row.bidang_nama || props.row.bidang_id || '-' }}
              </q-td>
            </template>

            <template v-slot:body-cell-is_custom="props">
              <q-td :props="props" class="text-center">
                <q-badge v-if="props.row.is_custom" color="orange" label="Custom" />
                <q-badge v-else-if="props.row.is_default" color="green" label="Default" />
                <span v-else class="text-grey-6 text-caption">—</span>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-center">
                <q-btn flat round dense icon="delete" color="negative" :loading="removingId === props.row.id"
                  @click="onRemove(props.row)">
                  <q-tooltip>Hapus dari sekolah ini</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'
import { ProgramKeahlianService } from '@/services/admin/ProgramKeahlianService'

const props = defineProps({
  tenants: { type: Array, default: () => [] },
})

const $q = useQuasar()

// ── State
const selectedTenantId = ref(null)
const selectedTenantLabel = ref('')
const selectedTenantJenjang = ref(null)

const loadingPrograms = ref(false)
const loadingMasters = ref(false)
const assigning = ref(false)
const removingId = ref(null)

const assignedPrograms = ref([])
const masterPrograms = ref([])
const programToAdd = ref(null)

// Filter state (client-side)
const tenantFilter = ref('')
const programFilter = ref('')

// ── Computed
const isSmkLike = computed(() => {
  const j = String(selectedTenantJenjang.value || '').toUpperCase()
  return j === 'SMK' || j === 'MAK'
})

const tenantOptions = computed(() => {
  const list = Array.isArray(props.tenants) ? props.tenants : []
  const q = tenantFilter.value.trim().toLowerCase()
  return list
    .filter((t) => {
      if (!q) return true
      const name = String(t.school_name || t.nama || '').toLowerCase()
      const slug = String(t.slug || t.subdomain || '').toLowerCase()
      return name.includes(q) || slug.includes(q)
    })
    .map((t) => ({
      id: t.id || t.tenant_id,
      label: `${t.school_name || t.nama || 'Tanpa Nama'} (${t.subdomain || t.slug || '-'})`,
      _raw: t,
    }))
})

const assignedIds = computed(() => new Set(assignedPrograms.value.map((p) => p.id)))

const availableMasterPrograms = computed(() => {
  const list = Array.isArray(masterPrograms.value) ? masterPrograms.value : []
  const q = programFilter.value.trim().toLowerCase()
  return list
    .filter((p) => !assignedIds.value.has(p.id))
    .filter((p) => {
      if (!q) return true
      return (
        String(p.nama || '').toLowerCase().includes(q) ||
        String(p.kode || '').toLowerCase().includes(q) ||
        String(p.bidang_nama || '').toLowerCase().includes(q)
      )
    })
    .map((p) => ({
      id: p.id,
      label: `${p.kode} — ${p.nama} (${p.bidang_nama || p.bidang_id || '-'})`,
    }))
})

const programColumns = [
  { name: 'kode', label: 'Kode', field: 'kode', align: 'left', style: 'width: 100px' },
  { name: 'nama', label: 'Nama Program', field: 'nama', align: 'left' },
  { name: 'bidang', label: 'Bidang', field: 'bidang_nama', align: 'left' },
  { name: 'is_custom', label: 'Tipe', align: 'center', style: 'width: 100px' },
  { name: 'actions', label: 'Aksi', align: 'center', style: 'width: 80px' },
]

// ── Filters
const onFilterTenant = (val, update) => {
  update(() => {
    tenantFilter.value = val
  })
}

const onFilterProgram = (val, update) => {
  update(() => {
    programFilter.value = val
  })
}

// ── Loaders
const loadMasters = async () => {
  loadingMasters.value = true
  try {
    const res = await ProgramKeahlianService.getProgramKeahlian()
    masterPrograms.value = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
        ? res.data
        : []
  } catch (e) {
    console.error('[TenantPrograms] load masters failed:', e)
    $q.notify({ type: 'negative', message: 'Gagal memuat master program keahlian.' })
    masterPrograms.value = []
  } finally {
    loadingMasters.value = false
  }
}

const loadPrograms = async () => {
  if (!selectedTenantId.value) {
    assignedPrograms.value = []
    return
  }
  loadingPrograms.value = true
  try {
    const res = await TenantService.getTenantPrograms(selectedTenantId.value)
    assignedPrograms.value = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
        ? res.data
        : []

    // Optional tenant metadata (kalau backend embed)
    if (res.data?.tenant?.jenjang) {
      selectedTenantJenjang.value = res.data.tenant.jenjang
    }
  } catch (e) {
    console.error('[TenantPrograms] load failed:', e)
    const status = e.response?.status
    if (status !== 404) {
      $q.notify({ type: 'negative', message: 'Gagal memuat program keahlian tenant.' })
    }
    assignedPrograms.value = []
  } finally {
    loadingPrograms.value = false
  }
}

// ── Handlers
const onTenantChange = async (tenantId) => {
  programToAdd.value = null
  programFilter.value = ''
  selectedTenantJenjang.value = null

  if (!tenantId) {
    selectedTenantLabel.value = ''
    assignedPrograms.value = []
    return
  }

  const found = tenantOptions.value.find((t) => t.id === tenantId)
  selectedTenantLabel.value = found?.label || tenantId

  await loadPrograms()
}

const onAssign = async () => {
  if (!selectedTenantId.value || !programToAdd.value) return
  assigning.value = true
  try {
    await TenantService.assignTenantProgram(selectedTenantId.value, programToAdd.value)
    $q.notify({ type: 'positive', message: 'Program berhasil ditambahkan.' })
    programToAdd.value = null
    programFilter.value = ''
    await loadPrograms()
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.error || 'Gagal menambahkan program.',
    })
  } finally {
    assigning.value = false
  }
}

const onRemove = (program) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Hapus program <b>${program.nama}</b> dari sekolah ini?`,
    html: true,
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    removingId.value = program.id
    try {
      await TenantService.removeTenantProgram(selectedTenantId.value, program.id)
      $q.notify({ type: 'positive', message: 'Program berhasil dihapus.' })
      await loadPrograms()
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e.response?.data?.error || 'Gagal menghapus program.',
      })
    } finally {
      removingId.value = null
    }
  })
}

// ── Lifecycle
onMounted(() => {
  loadMasters()
})
</script>
