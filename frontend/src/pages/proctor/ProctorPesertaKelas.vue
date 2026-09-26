<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold">
        <q-icon name="groups" class="q-mr-sm" color="primary" />
        Peserta Ujian Kelas
      </div>
      <q-space />
      <q-chip v-if="isAdminView" color="deep-purple" text-color="white" icon="admin_panel_settings">
        Semua Kelas (Admin)
      </q-chip>
      <q-chip v-else-if="homeroomClass" color="primary" text-color="white" icon="class">
        Kelas: {{ homeroomClass.name }}
      </q-chip>
    </div>

    <q-banner dense rounded class="bg-amber-1 text-orange-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      <span v-if="isAdminView">
        Fitur ini akan menampilkan <b>peserta & non-peserta ujian semua kelas</b>.
        Backend: <b>CR-002 (Peserta ujian per kelas)</b>.
      </span>
      <span v-else>
        Fitur ini akan menampilkan <b>peserta & non-peserta ujian kelas yang Anda ampu</b>.
        Backend: <b>CR-002 (Peserta ujian per kelas)</b>.
      </span>
      <b>Implementasi di Batch C2.</b>
    </q-banner>

    <q-card flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="groups" size="xl" />
        <div class="text-subtitle1 q-mt-md">Peserta & Non-Peserta Ujian</div>
        <div class="text-caption q-mt-sm">
          {{ isAdminView
            ? 'Menampilkan status keikutsertaan semua siswa per ujian.'
            : 'Menampilkan status keikutsertaan siswa kelas yang Anda ampu per ujian.' }}
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProctorProfile } from '@/composables/proctor/useProctorProfile'

const authStore = useAuthStore()
const { homeroomClass } = useProctorProfile()

const isAdminView = computed(() => {
  const r = String(authStore.role || '').toUpperCase()
  return r === 'ADMIN' || r === 'SUPER_ADMIN'
})
</script>
