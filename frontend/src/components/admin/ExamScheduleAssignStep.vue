<!-- src/components/admin/ExamScheduleAssignStep.vue -->
<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-subtitle2 text-weight-bold text-primary">
        <q-icon name="person_pin" class="q-mr-xs" />
        Distribusi Kelas & Pengawas ({{ rows.length }} jadwal terisi)
      </div>
      <q-space />
      <q-btn flat dense size="sm" color="primary" icon="auto_fix_high" label="Auto-assign Semua"
        @click="$emit('auto-all')" />
    </div>

    <div v-if="rows.length === 0" class="text-center text-grey-7 q-pa-lg">
      <q-icon name="info" size="3rem" />
      <div class="q-mt-md">Belum ada jadwal yang diisi. Kembali ke langkah sebelumnya.</div>
    </div>

    <q-expansion-item v-for="(row, idx) in rows" :key="row._assignKey" :default-opened="idx < 2"
      header-class="bg-grey-2 rounded-borders q-mb-sm" class="q-mb-sm">
      <template #header>
        <q-item-section avatar>
          <q-avatar size="32px" color="primary" text-color="white" class="text-caption">
            {{ idx + 1 }}
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">
            {{ row.subject_nama }} — Tingkat {{ row.tingkat }}
            <q-badge v-if="row.kelompok === 'KEJURUAN'" color="deep-purple" class="q-ml-sm">
              {{ row.jurusan_nama }}
            </q-badge>
          </q-item-label>
          <q-item-label caption>
            {{ formatTanggal(row.tanggal) }} • {{ row.jam_mulai }}–{{ getEndTime(row) }}
            • {{ row.details?.length || 0 }} kelas
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn flat dense size="sm" color="primary" icon="auto_fix_high" @click.stop="$emit('auto-one', idx)">
            <q-tooltip>Auto-assign pengawas untuk jadwal ini</q-tooltip>
          </q-btn>
        </q-item-section>
      </template>

      <q-table :rows="row.details || []" :columns="columns" row-key="class_id" flat bordered dense hide-pagination
        :pagination="{ rowsPerPage: 0 }">
        <template #body-cell-class_nama="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.class_nama }}</div>
          </q-td>
        </template>

        <template #body-cell-ruang="props">
          <q-td :props="props">
            <q-select v-model="props.row.ruang_id" :options="ruangOptionsAll" dense outlined emit-value map-options
              options-dense @update:model-value="(val) => onRuangChange(row, props.row, val)" />
          </q-td>
        </template>

        <template #body-cell-pengawas1="props">
          <q-td :props="props">
            <q-select v-model="props.row.pengawas_ids[0]" :options="teacherOptions" dense outlined emit-value
              map-options options-dense clearable @update:model-value="() => syncNama(row, props.row)" />
          </q-td>
        </template>

        <template #body-cell-pengawas2="props">
          <q-td :props="props">
            <q-select v-model="props.row.pengawas_ids[1]" :options="teacherOptions" dense outlined emit-value
              map-options options-dense clearable @update:model-value="() => syncNama(row, props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-expansion-item>
  </div>
</template>

<script setup>

const props = defineProps({
  rows: { type: Array, default: () => [] },
  teachers: { type: Array, default: () => [] },         // ← TAMBAH (raw)
  teacherOptions: { type: Array, default: () => [] },
  ruangOptionsAll: { type: Array, default: () => [] },
  getEndTime: { type: Function, default: () => '--:--' },
})

defineEmits(['auto-one', 'auto-all'])

const columns = [
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'min-width: 130px' },
  { name: 'ruang', label: 'Ruang', field: 'ruang_id', align: 'left', style: 'min-width: 150px' },
  { name: 'pengawas1', label: 'Pengawas 1', field: 'pengawas1', align: 'left', style: 'min-width: 200px' },
  { name: 'pengawas2', label: 'Pengawas 2', field: 'pengawas2', align: 'left', style: 'min-width: 200px' },
]

const formatTanggal = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const onRuangChange = (row, detail, val) => {
  const r = props.ruangOptionsAll.find((o) => o.value === val)
  detail.ruang_nama = r?.label || null
}

const syncNama = (row, detail) => {
  const ids = Array.isArray(detail.pengawas_ids) ? detail.pengawas_ids : []
  const namas = ids
    .map((id) => props.teachers.find((x) => x.id === id)?.nama)
    .filter(Boolean)
  detail.pengawas_namas = namas
  // Pastikan array 2 slot
  while (detail.pengawas_ids.length < 2) detail.pengawas_ids.push(null)
}
</script>
