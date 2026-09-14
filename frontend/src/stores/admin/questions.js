import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/boot/axios'

export const useAdminQuestionsStore = defineStore('adminQuestions', () => {
  const parsedQuestions = ref([])
  const parseErrors = ref([])
  const isUploading = ref(false)
  const uploadProgress = ref(0)

  const validQuestions = computed(() => parsedQuestions.value.filter((q) => !q._error))
  const invalidQuestions = computed(() => parsedQuestions.value.filter((q) => q._error))

  const parseFile = async (file, examId) => {
    isUploading.value = true
    uploadProgress.value = 0
    parseErrors.value = []

    try {
      const formData = new FormData()
      formData.append('exam_id', examId)
      formData.append('file', file)

      const res = await api.post('/admin/questions/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          uploadProgress.value = Math.round((e.loaded * 100) / e.total)
        },
      })
      parsedQuestions.value = res.data.questions || []
      return { success: true, total: parsedQuestions.value.length }
    } catch (error) {
      parseErrors.value.push({ row: 0, message: error.response?.data?.message || 'Gagal' })
      throw error
    } finally {
      isUploading.value = false
    }
  }

  return {
    parsedQuestions,
    parseErrors,
    isUploading,
    uploadProgress,
    validQuestions,
    invalidQuestions,
    parseFile,
  }
})
