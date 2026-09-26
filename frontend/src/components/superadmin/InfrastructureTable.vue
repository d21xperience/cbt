<!-- src/components/superadmin/InfrastructureTable.vue -->
<template>
  <q-card flat bordered class="bg-white">
    <q-card-section class="row items-center">
      <div class="text-subtitle1 text-weight-bold col">{{ title }}</div>
      <q-btn color="primary" icon="add" :label="addLabel" no-caps dense @click="$emit('add')" />
    </q-card-section>

    <q-table :rows="items" :columns="columns" row-key="id" flat :loading="loading"
      :no-data-label="emptyLabel">
      <template v-slot:body-cell-biaya="props">
        <q-td :props="props">
          {{ formatRupiah(props.row.biaya_bulanan ?? props.row.biaya_tahunan) }}
        </q-td>
      </template>

      <template v-slot:body-cell-tanggal_sewa="props">
        <q-td :props="props">{{ formatDate(props.row.tanggal_sewa) }}</q-td>
      </template>

      <template v-slot:body-cell-tanggal_registrasi="props">
        <q-td :props="props">{{ formatDate(props.row.tanggal_registrasi) }}</q-td>
      </template>

      <template v-slot:body-cell-tanggal_issue="props">
        <q-td :props="props">{{ formatDate(props.row.tanggal_issue) }}</q-td>
      </template>

      <template v-slot:body-cell-tipe="props">
        <q-td :props="props" class="text-center">
          <q-badge outline color="primary" :label="props.row.tipe || '-'" />
        </q-td>
      </template>

      <template v-slot:body-cell-expiry="props">
        <q-td :props="props">
          <div class="text-caption">{{ formatDate(props.row.tanggal_expiry) }}</div>
          <q-badge :color="expiryColor(props.row.tanggal_expiry)" :label="expiryLabel(props.row.tanggal_expiry)" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center" style="white-space: nowrap">
          <q-btn flat round dense icon="edit" color="primary" @click="$emit('edit', props.row)">
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="delete" color="negative" @click="$emit('delete', props.row)">
            <q-tooltip>Hapus</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-card>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  title: { type: String, required: true },
  emptyLabel: { type: String, default: 'Belum ada data' },
  addLabel: { type: String, default: 'Tambah' },
})
defineEmits(['add', 'edit', 'delete'])

// ── Presentation helpers
const formatRupiah = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return 'Rp -'
  return `Rp ${n.toLocaleString('id-ID')}`
}

const formatDate = (v) => {
  if (!v) return '-'
  try {
    return new Date(v).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return v
  }
}

const computeExpiry = (dateStr) => {
  if (!dateStr) return { status: 'unknown', days_left: null }
  const now = Date.now()
  const expiry = new Date(dateStr).getTime()
  if (!Number.isFinite(expiry)) return { status: 'unknown', days_left: null }
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { status: 'expired', days_left: daysLeft }
  if (daysLeft <= 30) return { status: 'expiring_soon', days_left: daysLeft }
  return { status: 'active', days_left: daysLeft }
}

const expiryColor = (dateStr) => {
  const { status } = computeExpiry(dateStr)
  if (status === 'expired') return 'negative'
  if (status === 'expiring_soon') return 'warning'
  if (status === 'active') return 'positive'
  return 'grey'
}

const expiryLabel = (dateStr) => {
  const { status, days_left } = computeExpiry(dateStr)
  if (status === 'expired') return `Expired ${Math.abs(days_left)} hr`
  if (status === 'expiring_soon') return `${days_left} hr lagi`
  if (status === 'active') return `${days_left} hr`
  return 'Unknown'
}
</script>
