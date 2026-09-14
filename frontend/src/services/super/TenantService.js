// # API manajemen sekolah, VPS, & Cloudflare Tunnel
// src/services/TenantService.js
import { api } from '@/boot/axios'

export const TenantService = {
  /**
   * Ambil konfigurasi tenant berdasarkan slug (subdomain)
   */
  getConfig(tenantSlug) {
    return api.get(`/super/schools/${tenantSlug}/config`)
  },

  // Load direktori sekolah terdaftar dari endpoint portal publik
  getSchools() {
    return api.get('/super/schools')
  },
}
