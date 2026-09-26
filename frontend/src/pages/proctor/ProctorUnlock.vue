<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold">
        <q-icon name="lock_open" class="q-mr-sm" color="primary" />
        Buka Blok Ujian
      </div>
    </div>

    <q-banner dense rounded class="bg-amber-1 text-orange-9 q-mb-md">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Halaman ini akan berisi fitur buka blok peserta ujian.
      <b>Implementasi di Batch C3.</b>
    </q-banner>

    <q-card flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="lock_open" size="xl" />
        <div class="text-subtitle1 q-mt-md">Fitur Buka Blok Ujian</div>
        <div class="text-caption q-mt-sm">
          Akan menampilkan daftar peserta yang terblokir + tombol unlock.
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
// Placeholder — Batch C3
</script>
