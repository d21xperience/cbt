<template>
  <q-page class="q-pa-md bg-grey-3">
    <div class="row items-center q-mb-md">
      <div class="text-h5 text-weight-bold">
        <q-icon name="vpn_key" class="q-mr-sm" color="primary" />
        Token Display — Panel Proktor
      </div>
      <q-space />
      <q-btn flat icon="refresh" label="Reload" @click="manualReload" :loading="loadingList" />
      <q-btn flat :icon="autoRefresh ? 'pause' : 'play_arrow'" :label="autoRefresh ? 'Stop Auto' : 'Auto Refresh'"
        :color="autoRefresh ? 'negative' : 'positive'" @click="autoRefresh = !autoRefresh" />
    </div>

    <!-- Pilih Sesi -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-select v-model="selectedSessionId" :options="sessionOptions" option-label="label" option-value="id"
          emit-value map-options label="Pilih Sesi Ujian Aktif" outlined dense :loading="loadingList"
          @update:model-value="onSessionChange">
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.exam_title }}</q-item-label>
                <q-item-label caption>
                  {{ scope.opt.session_type }} · {{ formatTime(scope.opt.start_time) }} - {{
                    formatTime(scope.opt.end_time) }}
                  <q-badge :color="scope.opt.has_active_token ? 'positive' : 'warning'" class="q-ml-sm"
                    :label="scope.opt.has_active_token ? 'Token Aktif' : 'Belum Ada Token'" />
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>
    </q-card>

    <!-- Kartu Token Besar -->
    <q-card v-if="selectedSessionId && token" flat bordered class="token-card">
      <q-card-section class="text-center q-pa-xl">
        <div class="text-caption text-grey-7 q-mb-sm">TOKEN UJIAN SAAT INI</div>

        <!-- Token Display — besar, monospace, kontras tinggi -->
        <div class="token-display q-mb-lg">
          {{ spaced(token.token) }}
        </div>

        <!-- Countdown -->
        <div class="q-mb-md" style="max-width: 500px; margin: 0 auto">
          <q-linear-progress :value="progressRatio" :color="progressColor" track-color="grey-3" size="12px" rounded />
          <div class="text-h6 q-mt-sm text-weight-bold" :class="`text-${progressColor}`">
            ⏱ {{ formattedRemaining }}
          </div>
          <div class="text-caption text-grey-7">
            Rotasi otomatis berikutnya
          </div>
        </div>

        <!-- Aksi -->
        <div class="row justify-center q-gutter-sm q-mt-lg">
          <q-btn color="primary" icon="content_copy" label="Copy" @click="copyToken" size="lg" />
          <q-btn color="warning" icon="refresh" label="Rotate Sekarang" @click="rotateNow" :loading="rotating"
            size="lg" />
          <q-btn color="dark" icon="fullscreen" label="Fullscreen" @click="toggleFullscreen" size="lg" />
        </div>

        <!-- Meta -->
        <div class="text-caption text-grey-6 q-mt-lg">
          Last update: {{ lastUpdateAt }} · Auto-refresh {{ autoRefresh ? 'aktif' : 'nonaktif' }}
        </div>
      </q-card-section>
    </q-card>

    <!-- Empty state -->
    <q-card v-else-if="selectedSessionId" flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="key_off" size="xl" />
        <div class="q-mt-md">Belum ada token aktif untuk sesi ini.</div>
        <q-btn color="primary" icon="add" label="Generate Token Sekarang" class="q-mt-md" @click="rotateNow"
          :loading="rotating" />
      </q-card-section>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="touch_app" size="xl" />
        <div class="q-mt-md">Pilih sesi ujian di atas untuk menampilkan token.</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { ProctorService } from '@/services/admin/ProctorService'

const $q = useQuasar()

const loadingList = ref(false)
const rotating = ref(false)
const sessions = ref([])
const selectedSessionId = ref(null)
const token = ref(null)              // { token, valid_from, valid_until, remaining_seconds }
const autoRefresh = ref(true)
const lastUpdateAt = ref('')
const remainingSeconds = ref(0)      // countdown lokal

let pollInterval = null
let countdownInterval = null

const sessionOptions = computed(() =>
  sessions.value.map((s) => ({
    ...s,
    label: `${s.exam_title} · ${s.session_type} · ${formatTime(s.start_time)}`,
  })),
)

const progressRatio = computed(() => {
  if (!token.value?.valid_until) return 0
  const from = new Date(token.value.valid_from).getTime()
  const until = new Date(token.value.valid_until).getTime()
  const now = Date.now()
  if (until <= from) return 0
  return Math.max(0, Math.min(1, (until - now) / (until - from)))
})

const progressColor = computed(() => {
  const ratio = progressRatio.value
  if (ratio > 0.4) return 'positive'
  if (ratio > 0.15) return 'warning'
  return 'negative'
})

const formattedRemaining = computed(() => {
  const s = remainingSeconds.value
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

// ============ Fetch ============
const loadSessions = async () => {
  loadingList.value = true
  try {
    const { data } = await ProctorService.listSessions({ activeOnly: true })
    sessions.value = data.data || []
    // Auto-select first session kalau belum ada
    if (!selectedSessionId.value && sessions.value.length > 0) {
      selectedSessionId.value = sessions.value[0].id
      await fetchToken()
    }
  } catch (err) {
    console.error('Load sessions error:', err)
    $q.notify({ type: 'negative', message: 'Gagal memuat daftar sesi' })
  } finally {
    loadingList.value = false
  }
}

const fetchToken = async () => {
  if (!selectedSessionId.value) return
  try {
    const { data } = await ProctorService.getCurrentToken(selectedSessionId.value)
    if (!data.token) {
      token.value = null
      remainingSeconds.value = 0
      return
    }
    token.value = data
    remainingSeconds.value = data.remaining_seconds || 0
    lastUpdateAt.value = new Date().toLocaleTimeString('id-ID')
  } catch (err) {
    console.error('Fetch token error:', err)
  }
}

// ============ Actions ============
const onSessionChange = async (sid) => {
  token.value = null
  remainingSeconds.value = 0
  if (sid) await fetchToken()
}

const rotateNow = async () => {
  if (!selectedSessionId.value) return
  rotating.value = true
  try {
    await ProctorService.rotateToken(selectedSessionId.value)
    await fetchToken()
    $q.notify({ type: 'positive', message: 'Token berhasil di-rotate', position: 'top' })
  } catch (err) {
    const msg = err.response?.data?.error || 'Gagal rotate token'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    rotating.value = false
  }
}

const copyToken = async () => {
  if (!token.value?.token) return
  try {
    await copyToClipboard(token.value.token)
    $q.notify({ type: 'positive', message: 'Token di-copy ke clipboard', position: 'top', timeout: 1500 })
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal copy' })
  }
}

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

const manualReload = async () => {
  await loadSessions()
  if (selectedSessionId.value) await fetchToken()
}

// ============ Helpers ============
const spaced = (s) => (s || '').split('').join('  ')
const formatTime = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ============ Lifecycle ============
onMounted(async () => {
  await loadSessions()

  // Poll server setiap 30 detik untuk token baru (jika proctor rotate atau worker auto-rotate)
  pollInterval = setInterval(() => {
    if (autoRefresh.value && selectedSessionId.value) fetchToken()
  }, 30000)

  // Countdown lokal setiap 1 detik
  countdownInterval = setInterval(() => {
    if (remainingSeconds.value > 0) remainingSeconds.value -= 1
    if (remainingSeconds.value <= 0 && selectedSessionId.value) {
      // Token expired — trigger fetch untuk dapat token baru
      fetchToken()
      remainingSeconds.value = 1 // hindari infinite loop dalam 1 detik
    }
  }, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style scoped>
.token-card {
  max-width: 800px;
  margin: 0 auto;
}

.token-display {
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 96px;
  font-weight: 900;
  letter-spacing: 8px;
  line-height: 1.1;
  color: #1976d2;
  text-shadow: 0 2px 4px rgba(25, 118, 210, 0.15);
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%);
  border-radius: 16px;
  border: 2px dashed #90caf9;
  user-select: all;
  word-break: break-all;
}

@media (max-width: 600px) {
  .token-display {
    font-size: 56px;
    letter-spacing: 4px;
  }
}
</style>
