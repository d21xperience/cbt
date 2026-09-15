<template>
  <q-page class="flex flex-center bg-grey-2">
    <div style="max-width: 750px; width: 100%" class="q-pa-md">
      <q-card>
        <q-card-section class="bg-primary text-white">
          <div class="text-h5">Persiapan Ujian</div>
          <div class="text-caption">Pastikan semua data siap sebelum memulai</div>
        </q-card-section>

        <q-card-section>
          <!-- Progress bar -->
          <q-linear-progress :value="store.progress" color="primary" class="q-mb-md" />
          <div class="row justify-between text-caption">
            <span>{{ Math.round(store.progress * 100) }}%</span>
            <span>{{ formatSize(store.downloadedSize) }} / {{ formatSize(store.totalSize) }}</span>
          </div>

          <!-- Cached indicator -->
          <div v-if="store.isCached" class="q-mb-md text-positive">
            <q-icon name="check_circle" /> Data ujian sudah tersedia di perangkat Anda.
          </div>

          <!-- Stages list -->
          <q-list dense bordered>
            <q-item v-for="stage in store.stages" :key="stage.id">
              <q-item-section avatar>
                <q-icon :name="statusIcon(stage.status)" :color="statusColor(stage.status)" />
              </q-item-section>
              <q-item-section>
                <div>{{ stage.label }}</div>
                <div v-if="stage.error" class="text-caption text-negative">{{ stage.error }}</div>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="statusBadge(stage.status)">{{
                  stage.status.toUpperCase()
                }}</q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <!-- Token section -->
        <q-card-section v-if="store.isReady" class="bg-grey-1">
          <div class="text-subtitle1">Masukkan Token Proktor</div>
          <q-input
            v-model="store.token"
            label="Token"
            outlined
            class="q-mt-sm"
            @keyup.enter="submitToken"
          />
          <q-btn
            label="Mulai Ujian"
            color="primary"
            class="full-width q-mt-sm"
            @click="submitToken"
            :loading="loadingToken"
          />
        </q-card-section>

        <q-card-actions>
          <q-btn
            flat
            label="Refresh"
            @click="startPreparation"
            icon="refresh"
            :loading="isRefreshing"
          />
          <q-space />
          <q-btn flat label="Kembali" @click="goBack" icon="arrow_back" />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePreparationStore } from '@/stores/exam/examPreparation'
import { usePreparation } from '@/composables/exam/usePreparation'
import { useRouter } from 'vue-router'
// import { useQuasar } from 'quasar';

const store = usePreparationStore()
const { start, submitToken } = usePreparation()
const router = useRouter()
// const $q = useQuasar();
const loadingToken = ref(false)
const isRefreshing = ref(false)

onMounted(() => {
  startPreparation()
})

const startPreparation = async () => {
  isRefreshing.value = true
  try {
    await start()
  } catch {
    // error already handled in composable
  } finally {
    isRefreshing.value = false
  }
}

// const submitTokenAction = async () => {
//   loadingToken.value = true;
//   try {
//     const valid = await submitToken(store.token);
//     if (valid) {
//       router.push('/exam/session');
//     } else {
//       $q.notify({ type: 'negative', message: 'Token tidak valid, coba lagi' });
//     }
//   } catch {
//     $q.notify({ type: 'negative', message: 'Terjadi kesalahan validasi token' });
//   } finally {
//     loadingToken.value = false;
//   }
// };

const goBack = () => {
  router.push('/')
}

const statusIcon = (status) => {
  const map = {
    waiting: 'hourglass_top',
    running: 'sync',
    success: 'check_circle',
    failed: 'error',
    skipped: 'remove_circle',
  }
  return map[status] || 'help'
}
const statusColor = (status) => {
  const map = {
    waiting: 'grey',
    running: 'blue',
    success: 'green',
    failed: 'red',
    skipped: 'orange',
  }
  return map[status]
}
const statusBadge = (status) => {
  const map = {
    waiting: 'grey',
    running: 'blue',
    success: 'green',
    failed: 'red',
    skipped: 'orange',
  }
  return map[status]
}

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
</script>
