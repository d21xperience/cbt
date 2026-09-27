// src/composables/admin/useProctorListPrint.js
// Composable untuk print Daftar Pengawas.

import { ref } from 'vue'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { ExamTypeService } from '@/services/admin/ExamTypeService'
import { getTenantSlug } from '@/utils/tenant'
import {
  buildProctorListPdfDefinition,
  openProctorListPdf,
  downloadProctorListPdf,
} from '@/utils/pdf/proctorListTemplatePdf'

export function useProctorListPrint() {
  const printing = ref(false)

  const print = async ({ rows = [], filters = {}, mode = 'open' }) => {
    if (!rows || rows.length === 0) {
      return { success: false, message: 'Tidak ada data untuk dicetak' }
    }
    printing.value = true
    try {
      const [schoolRes, typesRes] = await Promise.allSettled([
        SchoolProfileService.getProfile(),
        ExamTypeService.list(),
      ])

      const school =
        schoolRes.status === 'fulfilled'
          ? schoolRes.value.data?.data || schoolRes.value.data || {}
          : {}
      const examTypes =
        typesRes.status === 'fulfilled'
          ? typesRes.value.data?.data || typesRes.value.data || []
          : []

      const tenant = getTenantSlug() || ''
      const jt = filters.jenis_ujian_id
        ? examTypes.find((t) => t.id === filters.jenis_ujian_id)
        : null

      const def = buildProctorListPdfDefinition({
        rows,
        school,
        tenant,
        filterJenis: jt,
        filterTanggal: filters.tanggal || null,
        filterRuang: filters.ruang || null,
      })

      if (mode === 'download') {
        downloadProctorListPdf(def, `daftar-pengawas-${tenant || 'school'}-${Date.now()}.pdf`)
      } else {
        openProctorListPdf(def)
      }
      return { success: true, count: rows.length }
    } catch (e) {
      console.error('[ProctorListPrint] failed', e)
      return { success: false, message: e?.message || 'Gagal cetak' }
    } finally {
      printing.value = false
    }
  }

  return { printing, print }
}
