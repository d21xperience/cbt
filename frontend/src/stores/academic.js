import { defineStore } from 'pinia'
import { LocalStorage } from 'quasar'
import { AcademicPeriodService } from '@/services/admin/AcademicPeriodService'
import { ParticipantService } from '@/services/admin/ParticipantService'

function derivePeriodId(ay, smt) {
  if (!ay || !smt) return ''
  const parts = String(ay).split('/')
  if (parts.length < 1) return ''
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
      // ✅ PERBAIKAN: Hapus hardcoded '20251', biarkan kosong agar dipaksa sync dari backend
      active_period_id: saved?.active_period_id || '',
      academic_year: saved?.academic_year || '',
      semester: saved?.semester || '',
      exam_mode: LocalStorage.getItem(EXAM_MODE_KEY) || '',
      academicYearOptions: ['2025/2026', '2026/2027', '2027/2028', '2028/2029'],
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
      this.active_period_id = period_id || derivePeriodId(academic_year, semester)
      LocalStorage.set(STORAGE_KEY, {
        academic_year,
        semester,
        active_period_id: this.active_period_id,
      })
    },

    // ✅ BARU: Sinkronisasi autoritatif dari backend (mengambil is_active: true)
    async syncActivePeriod() {
      try {
        const res = await AcademicPeriodService.list()
        const list = res?.data?.data || []
        const active = list.find((p) => p.is_active === true)
        
        if (active) {
          // Paksa update ke periode aktif yang sebenarnya, abaikan cache lama
          this.setPeriod(active.academic_year, active.semester, active.id)
        }
      } catch (err) {
        console.warn('[AcademicStore] Failed to sync active period:', err)
      }
    },

    async setExamMode(mode) {
      try {
        const res = await ParticipantService.toggleExamMode(mode, this.active_period_id)
        if (res.data.status === 'ok') {
          this.exam_mode = mode
          if (mode) {
            LocalStorage.set(EXAM_MODE_KEY, mode)
          } else {
            LocalStorage.remove(EXAM_MODE_KEY)
          }
          return { success: true, message: res.data.message }
        }
      } catch (error) {
        console.error('[AcademicStore] Failed to toggle exam mode:', error)
        return {
          success: false,
          message: error.response?.data?.error || 'Gagal mengubah mode ujian',
        }
      }
    },

    // ✅ BARU: Update exam mode secara lokal tanpa API call (dipanggil setelah login)
    setExamModeLocal(mode) {
      this.exam_mode = mode || ''
      if (mode) {
        LocalStorage.set(EXAM_MODE_KEY, mode)
      } else {
        LocalStorage.remove(EXAM_MODE_KEY)
      }
    },
  },
})
