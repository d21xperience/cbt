<!-- src/components/exam/ExamLockOverlay.vue -->
<template>
  <div v-if="isLocked" class="lock-overlay">
    <q-card class="lock-card" flat>
      <q-card-section class="lock-content text-center">
        <q-icon name="lock" :size="iconSize" color="negative" class="q-mb-md" />

        <div class="lock-title text-negative q-mb-md">UJIAN TERKUNCI</div>

        <div class="lock-message text-grey-8 q-mb-md">
          Terdeteksi melakukan kecurangan.<br />
          Silakan menghubungi <b>pengawas</b> untuk membuka kunci.
        </div>

        <q-separator class="q-my-md" />

        <div class="text-body2 text-grey-7">
          Total pelanggaran: <b class="text-negative">{{ violationCount }}x</b>
        </div>

        <div v-if="lockLevel === 1" class="text-caption text-orange-8 q-mt-md">
          <q-icon name="info" size="xs" /> Setelah dibuka, sisa kesempatan: <b>2</b>
        </div>
        <div v-else-if="lockLevel === 2" class="text-caption text-red-8 q-mt-md">
          <q-icon name="warning" size="xs" /> Pelanggaran berulang — hanya <b>ADMIN</b> yang dapat
          membuka.
        </div>

        <q-separator class="q-my-md" />

        <div class="lock-waiting text-caption text-grey-6">
          <q-spinner-dots size="1.2em" color="grey-6" class="q-mr-xs" />
          Menunggu pengawas membuka kunci...
        </div>

        <!-- DEV helper -->
        <div v-if="isDev" class="q-mt-lg">
          <q-btn flat dense size="sm" color="grey-6" icon="build" label="Simulasi Unlock (dev)"
            @click="$emit('dev-unlock')" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { hapticLockLevel1, hapticLockLevel2, hapticUnlock } from '@/utils/haptics'

const props = defineProps({
  isLocked: { type: Boolean, default: false },
  lockLevel: { type: Number, default: 0 },
  violationCount: { type: Number, default: 0 },
})

defineEmits(['dev-unlock'])

const $q = useQuasar()
const isDev = import.meta.env.DEV

const iconSize = computed(() => ($q.screen.lt.md ? '4rem' : '6rem'))

// Haptic saat lock muncul / unlock — level 1 dan 2 beda pattern
watch(
  () => props.isLocked,
  (val, oldVal) => {
    if (val && !oldVal) {
      if (props.lockLevel === 2) hapticLockLevel2()
      else hapticLockLevel1()
    } else if (!val && oldVal) {
      hapticUnlock()
    }
  },
)
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
  overflow-y: auto;
}

.lock-card {
  max-width: 480px;
  width: 100%;
  border-radius: 16px;
  background: #fff;
  max-height: 96vh;
  overflow-y: auto;
}

.lock-content {
  padding: clamp(20px, 5vw, 40px) !important;
}

.lock-title {
  font-size: clamp(1.4rem, 6vw, 2rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.5px;
}

.lock-message {
  font-size: clamp(0.9rem, 2.6vw, 1rem);
  line-height: 1.6;
}

.lock-waiting {
  font-size: clamp(0.75rem, 2vw, 0.85rem);
}

@media (max-width: 599px) {
  .lock-overlay {
    padding: 8px;
    align-items: center;
  }

  .lock-card {
    max-height: 94vh;
    border-radius: 14px;
  }
}
</style>
