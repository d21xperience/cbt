<template>
  <q-page class="q-pa-md">
    <!-- Kartu Profil Siswa -->
    <q-card flat bordered class="text-center q-pa-md shadow-1 q-mb-md">
      <q-card-section class="flex flex-center flex-column">
        <q-avatar size="100px" class="q-mb-md shadow-2">
          <img :src="student.avatar" alt="Foto Siswa">
        </q-avatar>
        <div class="text-h6 text-weight-bold text-grey-9">{{ student.name }}</div>
        <div class="text-subtitle2 text-grey-7">NIS: {{ student.nis }}</div>
        <q-badge color="blue-2" text-color="blue-9" class="q-mt-xs q-px-md text-weight-bold">
          {{ student.class }}
        </q-badge>
      </q-card-section>
    </q-card>

  </q-page>
</template>

<script setup>
import { ref } from 'vue';

const student = ref(
  {
    name: 'Jhon',
    avatar: '',
    nis: '',
    class: ''
  }
)
</script>
