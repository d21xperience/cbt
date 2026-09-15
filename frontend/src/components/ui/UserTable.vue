<template>
  <div>
    <div class="q-mb-md">
      <q-btn color="primary" icon="add" label="Tambah" @click="$emit('add')" />
    </div>
    <q-table :rows="data" :columns="columns" row-key="id" flat bordered dense>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            round
            dense
            icon="edit"
            color="info"
            @click="$emit('edit', props.row)"
            class="q-mr-sm"
          />
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            @click="$emit('delete', props.row)"
          />
        </q-td>
      </template>
      <template v-slot:body-cell-mataPelajaran="props">
        <q-td :props="props">
          <q-chip v-for="mapel in props.row.mataPelajaran" :key="mapel" dense>{{ mapel }}</q-chip>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
defineProps({
  data: Array,
  columns: Array,
})
defineEmits(['add', 'edit', 'delete'])
</script>
