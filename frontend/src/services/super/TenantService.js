// src/services/super/TenantService.js
import { api } from '@/boot/axios'

// Superadmin adalah lintas-tenant. Semua request di sini tidak butuh
// header X-Tenant-Slug, sehingga `skipTenant: true` dipasang.
const SUPER_CFG = { skipTenant: true }

export const TenantService = {
  // ── Tenant config
  getConfig(tenantSlug) {
    return api.get(`/super/schools/${tenantSlug}/config`, SUPER_CFG)
  },

  // ── Public directory
  getPublicSchools() {
    return api.get('/public/schools', { skipAuth: true, skipTenant: true })
  },

  // ── Super admin: tenant management
  getSchools() {
    return api.get('/super/schools', SUPER_CFG)
  },

  // ── Approval queue (BE-P1)
  getPendingSchools() {
    return api.get('/super/schools/pending', SUPER_CFG)
  },
  approveSchool(tenantId) {
    return api.post(`/super/schools/${tenantId}/approve`, null, SUPER_CFG)
  },
  rejectSchool(tenantId, reason) {
    return api.post(`/super/schools/${tenantId}/reject`, { reason }, SUPER_CFG)
  },

  // ── SaaS config per tenant
  getSaaSConfig(tenantId) {
    return api.get(`/super/schools/${tenantId}/config`, SUPER_CFG)
  },
  saveSaaSConfig(tenantId, payload) {
    return api.post(`/super/schools/${tenantId}/config`, payload, SUPER_CFG)
  },

  // ── VER-009: Program Keahlian per tenant
  getTenantPrograms(tenantId) {
    return api.get(`/super/schools/${tenantId}/programs`, SUPER_CFG)
  },
  assignTenantProgram(tenantId, programId) {
    return api.post(
      `/super/schools/${tenantId}/programs/assign`,
      {
        program_id: programId,
      },
      SUPER_CFG,
    )
  },
  removeTenantProgram(tenantId, programId) {
    return api.post(
      `/super/schools/${tenantId}/programs/remove`,
      {
        program_id: programId,
      },
      SUPER_CFG,
    )
  },

  // ── FASE 2: Super admin direct-create + operations
  registerSchool(payload) {
    return api.post('/super/schools/register', payload, SUPER_CFG)
  },
  updateSchool(tenantId, payload) {
    return api.put(`/super/schools/${tenantId}`, payload, SUPER_CFG)
  },
  suspendSchool(tenantId, reason) {
    return api.post(`/super/schools/${tenantId}/suspend`, { reason }, SUPER_CFG)
  },
  unsuspendSchool(tenantId, note) {
    return api.post(`/super/schools/${tenantId}/unsuspend`, { note }, SUPER_CFG)
  },
  setSyncLock(tenantId, locked) {
    return api.post(`/super/schools/${tenantId}/sync-lock`, { locked }, SUPER_CFG)
  },
}
