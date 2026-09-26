<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 480px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">
          <q-icon name="assignment" class="q-mr-xs" />
          Pilih Jenis Ujian
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="text-caption text-grey-7 q-mb-md">
          Jenis ujian akan menjadi konteks untuk pengelolaan soal.
        </div>

        <q-list bordered separator>
          <q-item v-for="type in examTypes" :key="type.id" clickable v-ripple :active="type.id === selectedId"
            active-class="bg-blue-1 text-primary" @click="$emit('select', type.id)">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" size="36px">
                {{ type.kode.substring(0, 3) }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ type.nama }}</q-item-label>
              <q-item-label caption>{{ type.deskripsi || '—' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="type.id === selectedId" name="check_circle" color="positive" />
            </q-item-section>
          </q-item>
        </q-list>
        <div class="text-caption text-grey-6 q-mt-sm">
          <q-icon name="info" size="xs" class="q-mr-xs" />
          Ujian Susulan dikelola via menu terpisah.
        </div>

        <div v-if="examTypes.length === 0" class="text-center q-pa-md text-grey-6">
          <q-icon name="warning" size="md" />
          <div class="q-mt-sm">Belum ada jenis ujian.</div>
          <div class="text-caption">
            Tambah di <b>/admin/references/exam-types</b>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  examTypes: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'select'])

const isOpen = ref(false)
watch(() => props.modelValue, (v) => { isOpen.value = v })
watch(isOpen, (v) => emit('update:modelValue', v))
</script>
