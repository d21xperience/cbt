// src/services/super/TenantService.js
import { api } from '@/boot/axios'

export const TenantService = {
  // ── Tenant config
  getConfig(tenantSlug) {
    return api.get(`/super/schools/${tenantSlug}/config`)
  },

  // ── Public directory
  getPublicSchools() {
    return api.get('/public/schools', { skipAuth: true, skipTenant: true })
  },

  // ── Super admin: tenant management
  getSchools() {
    return api.get('/super/schools')
  },

  // ── Approval queue (BE-P1)
  getPendingSchools() {
    return api.get('/super/schools/pending')
  },
  approveSchool(tenantId) {
    return api.post(`/super/schools/${tenantId}/approve`)
  },
  rejectSchool(tenantId, reason) {
    return api.post(`/super/schools/${tenantId}/reject`, { reason })
  },

  // ── SaaS config per tenant
  getSaaSConfig(tenantId) {
    return api.get(`/super/schools/${tenantId}/config`)
  },
  saveSaaSConfig(tenantId, payload) {
    return api.post(`/super/schools/${tenantId}/config`, payload)
  },

  // ── VER-009: Program Keahlian per tenant
  getTenantPrograms(tenantId) {
    return api.get(`/super/schools/${tenantId}/programs`)
  },
  assignTenantProgram(tenantId, programId) {
    return api.post(`/super/schools/${tenantId}/programs/assign`, {
      program_id: programId,
    })
  },
  removeTenantProgram(tenantId, programId) {
    return api.post(`/super/schools/${tenantId}/programs/remove`, {
      program_id: programId,
    })
  },

  // ── VER-011 (draft): Super admin direct-create + operations
  /**
   * Register school langsung dari super admin.
   * Body sesuai schema VER-007:
   *   { npsn, school_name, subdomain, contact_email, contact_phone,
   *     admin_username, admin_password, jenjang, program_duration_years }
   * Response 201: { status, message, data: { tenant_id, subdomain } }
   */
  registerSchool(payload) {
    return api.post('/super/schools/register', payload)
  },
  /**
   * Update data tenant existing.
   * VER-011 update: PUT /super/schools/:tenant_id
   */
  updateSchool(tenantId, payload) {
    return api.put(`/super/schools/${tenantId}`, payload)
  },
  /**
   * Suspend tenant (nonaktifkan akses sementara).
   * Body: { reason }
   */
  suspendSchool(tenantId, reason) {
    return api.post(`/super/schools/${tenantId}/suspend`, { reason })
  },
  /**
   * Aktifkan kembali tenant yang di-suspend.
   * Body: { note }
   */
  unsuspendSchool(tenantId, note) {
    return api.post(`/super/schools/${tenantId}/unsuspend`, { note })
  },

  /**
   * Toggle sync-lock (kunci izin sinkronisasi Dapodik).
   * Body: { locked: boolean }
   */
  setSyncLock(tenantId, locked) {
    return api.post(`/super/schools/${tenantId}/sync-lock`, { locked })
  },
}
