// src/composables/admin/useBeritaAcaraPrint.js
import { ref } from 'vue'
import { BeritaAcaraService } from '@/services/admin/BeritaAcaraService'
import { SchoolProfileService } from '@/services/admin/SchoolProfileService'
import { StudentService } from '@/services/admin/StudentService'
import { getTenantSlug } from '@/utils/tenant'
import {
  buildBeritaAcaraPdfDefinition,
  openBeritaAcaraPdf,
  downloadBeritaAcaraPdf,
} from '@/utils/pdf/beritaAcaraTemplatePdf'

export function useBeritaAcaraPrint() {
  const printing = ref(false)

  const print = async ({ items = [], mode = 'open' } = {}) => {
    if (!items || items.length === 0) {
      return { success: false, message: 'Tidak ada jadwal untuk dicetak' }
    }
    printing.value = true
    try {
      const [tplRes, schoolRes, stuRes] = await Promise.allSettled([
        BeritaAcaraService.getTemplate(),
        SchoolProfileService.getProfile(),
        StudentService.list(),
      ])

      const template = tplRes.status === 'fulfilled' ? tplRes.value.data?.data || {} : {}
      const school = schoolRes.status === 'fulfilled' ? schoolRes.value.data?.data || {} : {}
      const allStudents = stuRes.status === 'fulfilled' ? stuRes.value.data?.data || [] : []

      // Enrich items dengan daftar siswa per kelas (jika template minta)
      const needSiswa = !!template.tampilkan_daftar_siswa
      const enriched = items.map((it) => ({
        ...it,
        siswa: needSiswa
          ? allStudents.filter((s) => s.kelas_id === it.detail.class_id && s.status === 'AKTIF')
          : [],
      }))

      const tenant = getTenantSlug() || ''
      const def = buildBeritaAcaraPdfDefinition({ items: enriched, template, school, tenant })

      if (mode === 'download') {
        downloadBeritaAcaraPdf(def, `berita-acara-${tenant || 'school'}-${Date.now()}.pdf`)
      } else {
        openBeritaAcaraPdf(def)
      }
      return { success: true, count: items.length }
    } catch (e) {
      console.error('[BeritaAcaraPrint] failed', e)
      return { success: false, message: e?.message || 'Gagal cetak' }
    } finally {
      printing.value = false
    }
  }

  return { printing, print }
}
