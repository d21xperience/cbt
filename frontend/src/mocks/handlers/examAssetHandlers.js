// src/mocks/handlers/examAssetHandlers.js
import { examPackageData } from '../data/examAssetData'

const DELAY = 300

// Helper: generate blob dengan ukuran tertentu
const generateBlob = (sizeInBytes) => {
  const bytes = new Uint8Array(sizeInBytes)
  for (let i = 0; i < sizeInBytes; i++) {
    bytes[i] = i % 256
  }
  return new Blob([bytes])
}

export const examAssetHandlers = (mock) => {
  // 1. Download paket ujian (dinamis ID)
  mock.onGet(/\/exam\/download\/.+/).reply((config) => {
    const examId = config.url.split('/').pop()
    const data = examPackageData[examId]
    if (data) {
      return [200, data, { delay: DELAY }]
    } else {
      return [404, { message: 'Ujian tidak ditemukan' }]
    }
  })

  // 2. Validasi token ujian
  mock.onPost('/exam/validate-token').reply((config) => {
    const { token } = JSON.parse(config.data)
    if (token === 'valid-token') {
      return [200, { valid: true }, { delay: DELAY }]
    } else {
      return [200, { valid: false }, { delay: DELAY }]
    }
  })

  // 3. Intercept semua request ke https://example.com/* (untuk aset media)
  mock.onGet(new RegExp('https://example.com/.*')).reply((config) => {
    const url = config.url || ''
    let size = 0

    // Tentukan ukuran berdasarkan ekstensi
    if (url.includes('image') || url.includes('png') || url.includes('jpg')) {
      size = 500 * 1024 // 500 KB
    } else if (url.includes('audio')) {
      size = 2 * 1024 * 1024 // 2 MB
    } else if (url.includes('video')) {
      size = 15 * 1024 * 1024 // 15 MB
    } else if (url.includes('pdf')) {
      size = 1 * 1024 * 1024 // 1 MB
    } else {
      size = 100 * 1024 // 100 KB
    }

    // Simulasi delay 500ms agar progress download terlihat
    return new Promise((resolve) => {
      setTimeout(() => {
        const blob = generateBlob(size)
        resolve([200, blob, { 'Content-Type': 'application/octet-stream' }])
      }, 500)
    })
  })
}
