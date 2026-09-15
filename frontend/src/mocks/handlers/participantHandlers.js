// src/mocks/handlers/participantHandlers.js
import {
  // eslint-disable-next-line no-unused-vars
  mockParticipants as initialParticipants,
  mockImportPreview,
} from '../data/participantsData'
import { getParticipants, setParticipants, removeParticipant } from '../data/stateStore'
import Papa from 'papaparse'

const DELAY = 300

export const participantHandlers = (mock) => {
  // List Participants (dengan filter exam_id)
  mock.onGet('/admin/participants').reply((config) => {
    const examId = config.params?.exam_id
    let filtered = getParticipants()
    if (examId) {
      filtered = filtered.filter((p) => p.exam_id === examId)
    }
    console.log(`👥 [MOCK] Participants loaded: ${filtered.length}`)
    return [200, filtered, { delay: DELAY }]
  })

  // Import Participants - Parse CSV (tanpa /confirm)
  mock.onPost('/admin/participants/import-external').reply(
    (config) => {
      // Karena FormData tidak bisa di-parse via JSON, kita harus mengambil dari config.data (raw)
      // Namun axios-mock-adapter tidak mendukung FormData secara langsung, kita perlu menangani secara khusus.
      // Solusi: kita asumsikan data dikirim sebagai FormData, kita ekstrak dengan cara manual.
      // Di sini kita contohkan parsing dengan Papa di dalam handler.
      return new Promise((resolve) => {
        const formData = config.data
        if (!(formData instanceof FormData)) {
          return resolve([400, { message: 'File CSV tidak ditemukan' }])
        }
        const csvFile = formData.get('csv_file')
        if (!csvFile) {
          return resolve([400, { message: 'File CSV tidak ditemukan' }])
        }
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const preview = mockImportPreview(results.data)
            console.log(`📄 [MOCK] Participants CSV parsed: ${preview.length} rows`)
            resolve([
              200,
              {
                preview,
                errors: preview
                  .filter((p) => p._error)
                  .map((p) => ({ row: p._rowNumber, message: p._error })),
              },
            ])
          },
          error: (error) => {
            resolve([400, { message: 'Gagal parse CSV: ' + error.message }])
          },
        })
      })
    },
    { delay: 1500 },
  ) // delay bisa ditambahkan di opsi

  // Confirm Import Participants
  mock.onPost('/admin/participants/import-external/confirm').reply((config) => {
    const body = JSON.parse(config.data)
    // Simulasi import: kita tambahkan ke state (atau replace)
    const newParticipants = body.participants || []
    // Di sini kita bisa merge atau overwrite, contoh overwrite
    setParticipants(newParticipants)
    console.log(`✅ [MOCK] Participants imported: ${newParticipants.length}`)
    return [
      200,
      { message: 'Peserta berhasil diimport', imported_count: newParticipants.length },
      { delay: DELAY },
    ]
  })

  // Delete Participant (dynamic ID)
  mock.onDelete(/\/admin\/participants\/[\w-]+$/).reply((config) => {
    const participantId = config.url.split('/').pop()
    const success = removeParticipant(participantId)
    if (success) {
      console.log(`🗑️ [MOCK] Participant ${participantId} deleted`)
      return [200, { message: 'Peserta berhasil dihapus' }, { delay: DELAY }]
    } else {
      return [404, { message: 'Peserta tidak ditemukan' }]
    }
  })
}
