// src/composables/admin/useExamSchedulePrint.js
// Refactored — semua data via Service.

import { ref } from 'vue'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { getTenantSlug } from '@/utils/tenant'
import {
  buildExamSchedulePdfDefinition,
  openExamSchedulePdf,
  downloadExamSchedulePdf,
} from '@/utils/pdf/examScheduleTemplatePdf'

export function useExamSchedulePrint() {
  const printing = ref(false)

  const print = async ({ filters = {}, mode = 'open' } = {}) => {
    printing.value = true
    try {
      const [schedRes, schoolRes, typesRes] = await Promise.all([
        ExamScheduleService.list(filters),
        SchoolProfileService.getProfile(),
        ExamTypeService.list(),
      ])

      const schedules = schedRes.data?.data || []
      if (schedules.length === 0) {
        return { success: false, message: 'Tidak ada jadwal untuk dicetak' }
      }

      const school = schoolRes.data?.data || schoolRes.data || {}
      const examTypes = typesRes.data?.data || typesRes.data || []
      const tenant = getTenantSlug() || ''
      const jt = filters.jenis_ujian_id
        ? examTypes.find((t) => t.id === filters.jenis_ujian_id)
        : null

      const def = buildExamSchedulePdfDefinition({
        schedules,
        school,
        tenant,
        filterJenis: jt,
        filterTingkat: filters.tingkat || null,
        filterTanggal: filters.tanggal || null,
      })

      if (mode === 'download') {
        downloadExamSchedulePdf(def, `jadwal-ujian-${tenant || 'school'}-${Date.now()}.pdf`)
      } else {
        openExamSchedulePdf(def)
      }
      return { success: true, count: schedules.length }
    } catch (e) {
      console.error('[ExamSchedulePrint] failed', e)
      return { success: false, message: e?.message || 'Gagal cetak' }
    } finally {
      printing.value = false
    }
  }

  return { printing, print }
}
