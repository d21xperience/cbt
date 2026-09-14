// # API unggah, parse, & unduh bank soal

import { api } from '@/boot/axios'

export const questionService = {
  downloadTemplate(format = 'csv') {
    return api.get('/admin/questions/template', {
      responseType: 'blob',
      params: { format },
    })
  },

  parseFile(file, examId) {
    const formData = new FormData()
    formData.append('exam_id', examId)
    formData.append('file', file)

    return api.post('/admin/questions/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  submitBulkQuestions(examId, questions) {
    return api.post('/admin/questions/paste', {
      exam_id: examId,
      questions,
    })
  },
}
