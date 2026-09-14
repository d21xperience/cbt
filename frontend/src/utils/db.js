import Dexie from 'dexie'

export const db = new Dexie('ExamCache')

db.version(2).stores({
  packages: 'examId, hash, lastUpdated, totalSize, downloadedSize, status',
  assets: 'examId, url, [examId+url], hash, loadedBytes, totalBytes, status',
})

export const clearExamCache = async (examId) => {
  await db.packages.where('examId').equals(examId).delete()
  await db.assets.where('examId').equals(examId).delete()
}

export const getPackage = async (examId) => {
  return await db.packages.get({ examId })
}

export const savePackage = async (examId, data) => {
  await db.packages.put({ examId, ...data })
}

export const getAsset = async (examId, url) => {
  return await db.assets.get({ examId, url })
}

export const saveAsset = async (examId, url, blob, hash, loadedBytes, totalBytes) => {
  await db.assets.put({
    examId,
    url,
    blob,
    hash,
    loadedBytes: loadedBytes || blob.size,
    totalBytes: totalBytes || blob.size,
    status: 'complete',
  })
}

export const updateAssetProgress = async (examId, url, loadedBytes, totalBytes) => {
  const asset = await db.assets.get({ examId, url })
  if (asset) {
    asset.loadedBytes = loadedBytes
    asset.totalBytes = totalBytes || asset.totalBytes
    asset.status = 'downloading'
    await db.assets.put(asset)
  }
}

export const getAssetsByExam = async (examId) => {
  return await db.assets.where('examId').equals(examId).toArray()
}

export const deleteAssetsByExam = async (examId) => {
  await db.assets.where('examId').equals(examId).delete()
}
