import {
  db,
  getPackage,
  savePackage,
  getAsset,
  saveAsset,
  getAssetsByExam,
  deleteAssetsByExam,
  clearExamCache,
} from '@/utils/db'

export function useCacheManager() {
  const getCachedPackage = async (examId) => {
    return await getPackage(examId)
  }

  const savePackageMetadata = async (examId, metadata, hash, totalSize) => {
    await savePackage(examId, {
      metadata,
      hash,
      totalSize,
      downloadedSize: 0,
      lastUpdated: Date.now(),
      status: 'incomplete',
    })
  }

  const updatePackageProgress = async (examId, downloadedSize) => {
    const pkg = await getPackage(examId)
    if (pkg) {
      pkg.downloadedSize = downloadedSize
      pkg.lastUpdated = Date.now()
      if (downloadedSize >= pkg.totalSize) {
        pkg.status = 'complete'
      }
      await db.packages.put(pkg)
    }
  }

  const getCachedAsset = async (examId, url) => {
    return await getAsset(examId, url)
  }

  const saveAssetToCache = async (examId, url, blob, hash) => {
    await saveAsset(examId, url, blob, hash, blob.size, blob.size)
  }

  const updateAssetProgress = async (examId, url, loadedBytes, totalBytes) => {
    await updateAssetProgress(examId, url, loadedBytes, totalBytes)
  }

  const verifyIntegrity = async (examId, expectedHashMap) => {
    const assets = await getAssetsByExam(examId)
    for (const asset of assets) {
      if (asset.hash !== expectedHashMap[asset.url]) {
        return false
      }
    }
    return true
  }

  const clearCache = async (examId) => {
    await clearExamCache(examId)
  }

  const getCachedAssetsList = async (examId) => {
    return await getAssetsByExam(examId)
  }

  const deleteAssets = async (examId) => {
    await deleteAssetsByExam(examId)
  }
  const hasValidPackage = async (examId) => {
    const pkg = await db.packages.get({ examId })
    if (!pkg) return false
    // Selain itu bisa cek apakah semua aset ada (tidak wajib jika hash cukup)
    return true // sederhana, asumsi hash valid
  }
  return {
    getCachedPackage,
    savePackageMetadata,
    updatePackageProgress,
    getCachedAsset,
    saveAssetToCache,
    updateAssetProgress,
    verifyIntegrity,
    clearCache,
    getCachedAssetsList,
    deleteAssets,
    hasValidPackage,
  }
}
