<template>
  <q-page padding>
    <div class="text-h6 q-mb-md">Monitoring Sesi: {{ sessionId }}</div>
    <q-banner class="bg-amber-2 text-orange-9">
      <template v-slot:avatar>
        <q-icon name="construction" />
      </template>
      Dashboard monitoring real-time akan tersedia di iterasi berikutnya.
    </q-banner>
    <q-btn class="q-mt-md" flat icon="arrow_back" label="Kembali" :to="{ name: 'proctor-dashboard' }" />
  </q-page>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
const sessionId = route.params.sessionId
</script>
