import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExamWaitingRoomStore = defineStore('examWaitingRoom', () => {
  const studentProfile = ref(null)
  const availableExams = ref([])
  const tokenDialog = ref({ show: false, examId: '', examSubject: '', inputToken: '' })

  const activeExams = computed(
    () =>
      availableExams.value?.filter((e) => e.status === 'ready' || e.status === 'upcoming') || [],
  )
  const completedExams = computed(
    () => availableExams.value?.filter((e) => e.status === 'completed') || [],
  )

  const openTokenPrompt = (exam) => {
    tokenDialog.value = { show: true, examId: exam.id, examSubject: exam.subject, inputToken: '' }
  }

  return {
    studentProfile,
    availableExams,
    tokenDialog,
    activeExams,
    completedExams,
    openTokenPrompt,
  }
})
