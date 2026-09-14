// src/stores/questions.js
import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useQuestionsStore = defineStore('questions', {
  state: () => ({
    // List ujian (untuk dropdown)
    exams: [],

    // Soal yang sudah di-parse (belum submit)
    parsedQuestions: [],

    // State UI
    isUploading: false,
    isSubmitting: false,
    uploadProgress: 0,

    // Error tracking
    parseErrors: [],

    // Stats
    stats: {
      totalQuestions: 0,
      byExam: {},
    },
  }),

  getters: {
    validQuestions: (state) => state.parsedQuestions.filter((q) => !q._error),
    invalidQuestions: (state) => state.parsedQuestions.filter((q) => q._error),
    hasErrors: (state) => state.parseErrors.length > 0,
  },

  actions: {
    // ========================================
    // FETCH EXAMS (untuk dropdown)
    // ========================================
    async fetchExams() {
      try {
        const res = await api.get('/admin/exams')
        this.exams = res.data
      } catch (error) {
        console.error('Gagal fetch exams:', error)
        throw error
      }
    },

    // ========================================
    // DOWNLOAD TEMPLATE
    // ========================================
    async downloadTemplate(format = 'csv') {
      try {
        const res = await api.get('/admin/questions/template', {
          responseType: 'blob',
          params: { format },
        })

        // Create download link
        const blob = new Blob([res.data], {
          type:
            res.data.type ||
            (format === 'csv'
              ? 'text/csv'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        const extension = format === 'csv' ? 'csv' : 'xlsx'
        link.download = `template_soal_${Date.now()}.${extension}`

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        return true
      } catch (error) {
        console.error('Gagal download template:', error)
        throw error
      }
    },

    // ========================================
    // PARSE FILE (CSV/Excel)
    // ========================================
    async parseFile(file, examId) {
      this.isUploading = true
      this.uploadProgress = 0
      this.parseErrors = []
      this.parsedQuestions = []

      try {
        const formData = new FormData()
        formData.append('exam_id', examId)
        formData.append('file', file)

        const res = await api.post('/admin/questions/parse', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          },
        })

        this.parsedQuestions = res.data.questions || []
        this.parseErrors = res.data.errors || []

        return {
          success: true,
          total: this.parsedQuestions.length,
          valid: this.validQuestions.length,
          invalid: this.invalidQuestions.length,
        }
      } catch (error) {
        console.error('Gagal parse file:', error)
        this.parseErrors.push({
          row: 0,
          message: error.response?.data?.message || 'Gagal memproses file',
        })
        throw error
      } finally {
        this.isUploading = false
        this.uploadProgress = 0
      }
    },

    // ========================================
    // PASTE MANUAL
    // ========================================
    setPastedQuestions(questions) {
      this.parsedQuestions = questions.map((q, idx) => ({
        ...q,
        _rowNumber: idx + 1,
      }))
      this.parseErrors = []
    },

    // ========================================
    // SUBMIT QUESTIONS
    // ========================================
    async submitQuestions(examId) {
      if (this.validQuestions.length === 0) {
        throw new Error('Tidak ada soal valid untuk disubmit')
      }

      this.isSubmitting = true
      try {
        const res = await api.post('/admin/questions/paste', {
          exam_id: examId,
          questions: this.validQuestions.map((q) => ({
            question_type: q.question_type,
            question_text: q.question_text,
            options: q.options,
            correct_option: q.correct_option,
            score: q.score || 10,
            media_url: q.media_url || null,
            rubric: q.rubric || null,
          })),
        })

        // Reset state
        this.parsedQuestions = []
        this.parseErrors = []

        return res.data
      } catch (error) {
        console.error('Gagal submit soal:', error)
        throw error
      } finally {
        this.isSubmitting = false
      }
    },

    // ========================================
    // CLEAR STATE
    // ========================================
    clearParsedQuestions() {
      this.parsedQuestions = []
      this.parseErrors = []
    },
  },
})
