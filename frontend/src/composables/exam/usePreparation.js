import { usePreparationStore } from '@/stores/exam/examPreparation'
import { useCacheManager } from './exam/useCacheManager'
import { useAssetDownloader } from './useAssetDownloader'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/boot/axios'
import { useQuasar } from 'quasar'

export function usePreparation() {
  const store = usePreparationStore()
  const cache = useCacheManager()
  const downloader = useAssetDownloader()
  const auth = useAuthStore()
  const $q = useQuasar()

  const start = async () => {
    const examId = auth.examId // from login
    store.reset()
    store.setStageStatus('identity', 'running')

    try {
      // 1. Identity
      await validateIdentity()
      store.setStageStatus('identity', 'success')

      // 2. Schedule
      store.setStageStatus('schedule', 'running')
      await validateSchedule()
      store.setStageStatus('schedule', 'success')

      // 3. Check cache
      store.setStageStatus('metadata', 'running')
      const pkg = await cache.getCachedPackage(examId)
      let metadata = null
      let assets = []
      let totalSize = 0
      let hashMap = {}

      if (pkg && pkg.status === 'complete') {
        // Cache exists and is complete
        store.isCached = true
        store.cachedPackage = pkg
        // We still need to fetch metadata to get asset list for verification
        metadata = await fetchMetadata(examId)
        assets = metadata.assets
        totalSize = metadata.totalSize
        hashMap = metadata.hashMap
        // Verify integrity
        store.setStageStatus('verify', 'running')
        const valid = await cache.verifyIntegrity(examId, hashMap)
        if (!valid) {
          // Cache corrupted, delete and re-download
          await cache.clearCache(examId)
          store.isCached = false
          // fall through to download
        } else {
          store.setStageStatus('verify', 'success')
          store.setStageStatus('cache', 'success')
          // skip download
          store.setStageStatus('download', 'skipped')
          store.updateProgress(totalSize, totalSize)
          store.isReady = true
          store.setStageStatus('token', 'waiting')
          return
        }
      }

      // If not cached or corrupted, proceed to download
      if (!store.isCached) {
        // Fetch metadata
        metadata = await fetchMetadata(examId)
        assets = metadata.assets
        totalSize = metadata.totalSize
        hashMap = metadata.hashMap

        // Save metadata to cache
        await cache.savePackageMetadata(examId, metadata, metadata.hash, totalSize)
        store.totalSize = totalSize

        // 4. Download
        store.setStageStatus('download', 'running')
        let attempt = 0
        let errors = []
        const maxRetries = 3
        let success = false

        while (attempt < maxRetries && !success) {
          const result = await downloader.downloadQueue(
            examId,
            assets.map((a) => ({ url: a.url, hash: a.hash, totalBytes: a.totalBytes })),
            (progress) => {
              const downloaded = progress * totalSize
              store.updateProgress(downloaded, totalSize)
            },
            3, // concurrency
          )
          errors = result.errors
          if (errors.length === 0) {
            success = true
          } else {
            attempt++
            if (attempt < maxRetries) {
              $q.notify({
                type: 'warning',
                message: `Download gagal, mencoba ulang (${attempt}/${maxRetries})`,
              })
              // Optionally clear partially downloaded assets for retry? Actually we resume, so we keep.
            }
          }
        }

        if (!success) {
          store.setStageStatus('download', 'failed', errors.map((e) => e.error).join(', '))
          throw new Error('Download gagal setelah beberapa percobaan')
        } else {
          store.setStageStatus('download', 'success')
          store.updateProgress(totalSize, totalSize)
        }

        // 5. Verify
        store.setStageStatus('verify', 'running')
        const valid = await cache.verifyIntegrity(examId, hashMap)
        if (!valid) {
          store.setStageStatus('verify', 'failed')
          throw new Error('Integritas data gagal')
        }
        store.setStageStatus('verify', 'success')

        // 6. Mark cache complete
        await cache.updatePackageProgress(examId, totalSize)
        store.setStageStatus('cache', 'success')
        store.isReady = true
        store.setStageStatus('token', 'waiting')
      }
    } catch (err) {
      // Mark current running stage as failed
      const runningStage = store.stages.find((s) => s.status === 'running')
      if (runningStage) {
        store.setStageStatus(runningStage.id, 'failed', err.message)
      }
      $q.notify({ type: 'negative', message: err.message || 'Terjadi kesalahan' })
      // If error is fatal, we can allow user to retry by calling start again
    }
  }

  const validateIdentity = () => {
    if (!auth.user?.nisn) throw new Error('Identitas tidak valid')
  }

  const validateSchedule = async () => {
    // Fetch server time and compare
    try {
      const res = await api.get('/server-time')
      const serverTime = new Date(res.data.time)
      const localTime = new Date()
      const diff = Math.abs(serverTime - localTime)
      if (diff > 60000) {
        // more than 1 minute
        throw new Error('Waktu perangkat tidak sinkron dengan server')
      }
    } catch (err) {
      // If server time unavailable, maybe skip? But we'll throw.
      throw new Error('Gagal validasi waktu: ' + err.message)
    }
  }

  const fetchMetadata = async (examId) => {
    try {
      const res = await api.get(`/exam/${examId}/metadata`)
      return res.data
    } catch (err) {
      throw new Error('Gagal mengambil metadata: ' + err.message)
    }
  }

  const submitToken = async (token) => {
    try {
      const res = await api.post('/exam/validate-token', { token, examId: auth.examId })
      if (res.data.valid) {
        // optionally store token in auth store
        return true
      }
      return false
    } catch {
      $q.notify({ type: 'negative', message: 'Token tidak valid' })
      return false
    }
  }

  return {
    start,
    submitToken,
  }
}
