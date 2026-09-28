<!-- src/components/exam/ExamLockOverlay.vue -->
<template>
  <div v-if="isLocked" class="lock-overlay">
    <q-card class="lock-card" flat>
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="lock" size="6rem" color="negative" class="q-mb-md" />

        <div class="text-h4 text-weight-bold text-negative q-mb-md">UJIAN TERKUNCI</div>

        <div class="text-body1 text-grey-8 q-mb-md" style="line-height: 1.6">
          Terdeteksi melakukan kecurangan.<br />
          Silakan menghubungi <b>pengawas</b> untuk membuka kunci.
        </div>

        <q-separator class="q-my-md" />

        <div class="text-body2 text-grey-7">
          Total pelanggaran: <b class="text-negative">{{ violationCount }}x</b>
        </div>

        <div v-if="lockLevel === 1" class="text-caption text-orange-8 q-mt-md">
          <q-icon name="info" /> Setelah dibuka, sisa kesempatan: <b>2</b>
        </div>
        <div v-else-if="lockLevel === 2" class="text-caption text-red-8 q-mt-md">
          <q-icon name="warning" /> Pelanggaran berulang — hanya <b>ADMIN</b> yang dapat membuka.
        </div>

        <q-separator class="q-my-md" />

        <div class="text-caption text-grey-6">
          <q-spinner-dots size="1em" color="grey-6" class="q-mr-xs" />
          Menunggu pengawas membuka kunci...
        </div>

        <!-- DEV helper (hidden in production) -->
        <div v-if="isDev" class="q-mt-lg">
          <q-btn flat dense size="sm" color="grey-6" icon="build" label="Simulasi Unlock (dev)"
            @click="$emit('dev-unlock')" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
defineProps({
  isLocked: { type: Boolean, default: false },
  lockLevel: { type: Number, default: 0 },
  violationCount: { type: Number, default: 0 },
})

defineEmits(['dev-unlock'])

const isDev = import.meta.env.DEV
</script>

<style scoped>
.lock-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  user-select: none;
  -webkit-user-select: none;
}

.lock-card {
  max-width: 480px;
  width: 100%;
  border-radius: 16px;
  background: #fff;
}

@media (max-width: 480px) {
  .lock-overlay {
    padding: 8px;
  }
}
</style>
