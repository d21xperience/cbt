import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePreparationStore = defineStore('preparation', () => {
  const stages = ref([
    { id: 'identity', label: 'Validasi Identitas', status: 'waiting', error: null },
    { id: 'schedule', label: 'Validasi Jadwal & Waktu', status: 'waiting', error: null },
    { id: 'metadata', label: 'Mengambil Metadata Ujian', status: 'waiting', error: null },
    { id: 'download', label: 'Mengunduh Soal & Media', status: 'waiting', error: null },
    { id: 'verify', label: 'Verifikasi Integritas Data', status: 'waiting', error: null },
    { id: 'cache', label: 'Menyimpan Offline', status: 'waiting', error: null },
    { id: 'token', label: 'Menunggu Token Proktor', status: 'waiting', error: null },
  ])

  const progress = ref(0)
  const downloadedSize = ref(0)
  const totalSize = ref(0)
  const isReady = ref(false)
  const token = ref('')
  const errors = ref([])
  const isCached = ref(false)
  const cachedPackage = ref(null)

  const setStageStatus = (id, status, error = null) => {
    const stage = stages.value.find((s) => s.id === id)
    if (stage) {
      stage.status = status
      stage.error = error
    }
  }

  const reset = () => {
    stages.value.forEach((s) => {
      s.status = 'waiting'
      s.error = null
    })
    progress.value = 0
    downloadedSize.value = 0
    totalSize.value = 0
    isReady.value = false
    token.value = ''
    errors.value = []
    isCached.value = false
    cachedPackage.value = null
  }

  const updateProgress = (downloaded, total) => {
    downloadedSize.value = downloaded
    totalSize.value = total
    progress.value = total > 0 ? downloaded / total : 0
  }

  return {
    stages,
    progress,
    downloadedSize,
    totalSize,
    isReady,
    token,
    errors,
    isCached,
    cachedPackage,
    setStageStatus,
    reset,
    updateProgress,
  }
})
