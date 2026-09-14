import { ref } from 'vue'
import { useCacheManager } from './useCacheManager'

export function useAssetDownloader() {
  const { getCachedAsset, saveAssetToCache, updateAssetProgress } = useCacheManager()
  const isPaused = ref(false)
  const activeDownloads = new Map() // url -> AbortController

  const downloadAssetWithResume = async (examId, url, expectedHash, totalBytes) => {
    const cached = await getCachedAsset(examId, url)
    let startByte = 0
    if (cached) {
      if (cached.hash === expectedHash && cached.loadedBytes === cached.totalBytes) {
        // Already fully downloaded
        return cached.blob
      }
      // Partial download
      startByte = cached.loadedBytes || 0
    }

    const controller = new AbortController()
    activeDownloads.set(url, controller)

    try {
      const headers = {}
      if (startByte > 0) {
        headers.Range = `bytes=${startByte}-`
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      })

      if (!response.ok && response.status !== 206) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) + (startByte || 0) : totalBytes || 0

      const reader = response.body.getReader()
      const chunks = []
      let loaded = startByte || 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        // update progress every chunk
        await updateAssetProgress(examId, url, loaded, total)
        // also update package progress? handled by orchestrator
      }

      // Combine chunks
      const blob = new Blob(chunks)
      // If we have cached partial, we need to combine with cached blob? Actually we streamed from startByte, so blob is complete from startByte to end.
      // We need to prepend existing blob if any.
      let finalBlob = blob
      if (cached && cached.blob && startByte > 0) {
        // Combine old blob with new blob
        const combined = new Blob([cached.blob, blob])
        finalBlob = combined
      }

      // Save full asset
      await saveAssetToCache(examId, url, finalBlob, expectedHash)
      activeDownloads.delete(url)
      return finalBlob
    } catch (error) {
      if (error.name === 'AbortError') {
        // download cancelled, don't throw
        console.log('Download aborted for', url)
        throw new Error('Download cancelled')
      }
      throw error
    }
  }

  const downloadQueue = async (examId, assets, onProgress, concurrency = 3) => {
    const queue = [...assets] // each asset { url, hash, totalBytes }
    const running = []
    // eslint-disable-next-line no-unused-vars
    let completed = 0
    let totalDownloaded = 0
    const totalSize = assets.reduce((sum, a) => sum + a.totalBytes, 0)
    const errors = []

    const processNext = async () => {
      if (queue.length === 0 || isPaused.value) return
      const asset = queue.shift()
      const { url, hash, totalBytes } = asset

      try {
        await downloadAssetWithResume(examId, url, hash, totalBytes)
        completed++
        // update total downloaded size
        // we can query cache manager for total downloaded size
        // but we'll just approximate
        totalDownloaded += totalBytes
        onProgress(totalDownloaded / totalSize)
      } catch (err) {
        errors.push({ url, error: err.message })
        // we could retry here, but we'll handle retry in orchestrator
      } finally {
        const idx = running.indexOf(processNext)
        if (idx > -1) running.splice(idx, 1)
        processNext()
      }
    }

    // Start initial concurrency
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      const task = processNext()
      running.push(task)
    }

    await Promise.allSettled(running)
    return { errors }
  }

  const cancelAll = () => {
    // eslint-disable-next-line no-unused-vars
    for (const [url, controller] of activeDownloads) {
      controller.abort()
    }
    activeDownloads.clear()
  }

  return {
    downloadQueue,
    cancelAll,
    isPaused,
  }
}
