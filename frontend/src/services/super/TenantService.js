// src/services/super/TenantService.js
import { api } from '@/boot/axios'

export const TenantService = {
  // ── Tenant config (publik untuk landing/login header)
  getConfig(tenantSlug) {
    return api.get(`/super/schools/${tenantSlug}/config`)
  },

  // ── Direktori publik (TANPA auth, TANPA X-Tenant-Slug)
  // Endpoint: GET /public/schools
  // Response: { status, count, data: [{ subdomain, school_name, npsn, logo_url }] }
  getPublicSchools() {
    return api.get('/public/schools', {
      skipAuth: true,
      skipTenant: true,
    })
  },

  // ── Super admin: manajemen sekolah (butuh JWT SUPER_ADMIN)
  getSchools() {
    return api.get('/super/schools')
  },

  // ── Approval queue (Phase 5)
  getPendingSchools() {
    return api.get('/super/schools/pending')
  },

  approveSchool(tenantId) {
    return api.post(`/super/schools/${tenantId}/approve`)
  },

  rejectSchool(tenantId, reason) {
    return api.post(`/super/schools/${tenantId}/reject`, { reason })
  },
}
