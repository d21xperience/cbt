import { defineStore } from 'pinia'
import { LocalStorage } from 'quasar'


function derivePeriodId(ay, smt) {
  if (!ay || !smt) return '20251'
  const parts = String(ay).split('/')
  if (parts.length < 1) return '20251'
  const year = parts[0]
  const suffix = String(smt).toUpperCase() === 'GENAP' ? '2' : '1'
  return `${year}${suffix}`
}

const STORAGE_KEY = 'cbt_academic_context'
const EXAM_MODE_KEY = 'cbt_exam_mode'

export const useAcademicStore = defineStore('academic', {
  state: () => {
    const saved = LocalStorage.getItem(STORAGE_KEY)
    return {
      active_period_id: saved?.active_period_id || '20251',
      academic_year: saved?.academic_year || '2025/2026',
      semester: saved?.semester || 'GANJIL',
      exam_mode: LocalStorage.getItem(EXAM_MODE_KEY) || null, // 'UTS' | 'UAS' | 'UH' | 'SURVEI' | null
      academicYearOptions: ['2025/2026', '2026/2027', '2027/2028'],
      semesterOptions: [
        { label: 'Ganjil', value: 'GANJIL' },
        { label: 'Genap', value: 'GENAP' },
      ],
    }
  },
  getters: {
    currentPeriodLabel: (state) => `${state.academic_year} — ${state.semester}`,
    isExamModeActive: (state) => !!state.exam_mode,
    isMainExamMode: (state) => ['UTS', 'UAS'].includes(state.exam_mode),
  },
  actions: {
    setPeriod(academic_year, semester, period_id = null) {
      this.academic_year = academic_year
      this.semester = semester
      // Derive period_id jika tidak dikirim
      this.active_period_id = period_id || derivePeriodId(academic_year, semester)
      LocalStorage.set(STORAGE_KEY, {
        academic_year,
        semester,
        active_period_id: this.active_period_id,
      })
    },
    setExamMode(mode) {
      this.exam_mode = mode
      if (mode) {
        LocalStorage.set(EXAM_MODE_KEY, mode)
      } else {
        LocalStorage.remove(EXAM_MODE_KEY)
      }
    }
  },
})
