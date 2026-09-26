// src/stores/super/superTenant.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/boot/axios'
import { Loading } from 'quasar'
import { TenantService } from '@/services/super/TenantService'

export const useSuperTenantStore = defineStore('superTenant', () => {
  const schoolList = ref([])
  const globalStats = ref({
    total_schools: 0,
    active_exams: 0,
    total_participants_online: 0,
    vps_cpu_estimate: 0,
  })

  // Alias: SchoolsManagement.vue pakai `store.schools`
  const schools = computed(() => schoolList.value)

  const fetchSchools = async () => {
    try {
      const res = await api.get('/super/schools')
      schoolList.value = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : []
    } catch (err) {
      console.error('[SuperTenant] fetch schools failed:', err)
      schoolList.value = []
    }
  }

  const getSchoolsAction = fetchSchools

  /**
   * Register tenant baru (super admin direct-create).
   * VER-011: POST /super/schools/register
   */
  const createSchoolTenant = async (payload) => {
    const res = await TenantService.registerSchool(payload)
    await fetchSchools()
    return res.data
  }
  /**
   * Update tenant existing.
   */
  const updateSchoolTenant = async (tenantId, payload) => {
    const res = await TenantService.updateSchool(tenantId, payload)
    await fetchSchools()
    return res.data
  }
  /**
   * Toggle sync-lock tenant.
   * VER-011: POST /super/schools/:tenant_id/sync-lock
   * Optimistic update: local state dulu, lalu API.
   */
  const updateSchoolSyncLock = async (schoolId, locked) => {
    const idx = schoolList.value.findIndex((s) => s.id === schoolId)
    const previous = idx !== -1 ? schoolList.value[idx].sync_locked : undefined

    if (idx !== -1) schoolList.value[idx].sync_locked = locked
    try {
      await TenantService.setSyncLock(schoolId, locked)
    } catch (err) {
      // rollback on error
      if (idx !== -1) schoolList.value[idx].sync_locked = previous
      throw err
    }
  }

  /**
   * Suspend tenant (nonaktifkan sementara).
   * VER-011: POST /super/schools/:tenant_id/suspend
   */
  const suspendSchool = async (schoolId, reason) => {
    await TenantService.suspendSchool(schoolId, reason)
    const idx = schoolList.value.findIndex((s) => s.id === schoolId)
    if (idx !== -1) schoolList.value[idx].is_suspended = true
  }

  /**
   * Aktifkan kembali tenant.
   */
  const unsuspendSchool = async (schoolId, note) => {
    await TenantService.unsuspendSchool(schoolId, note)
    const idx = schoolList.value.findIndex((s) => s.id === schoolId)
    if (idx !== -1) schoolList.value[idx].is_suspended = false
  }

  const triggerLocalTunnelTransfer = async (schoolId) => {
    Loading.show({ message: 'Membuat paket enkripsi data & membuka Cloudflare Tunnel...' })
    try {
      await api.post('/super/archive/tunnel-transfer', { school_id: schoolId })
      return true
    } catch {
      return false
    } finally {
      Loading.hide()
    }
  }

  return {
    schoolList,
    schools,
    globalStats,
    fetchSchools,
    getSchoolsAction,
    createSchoolTenant,
    updateSchoolTenant,
    updateSchoolSyncLock,
    suspendSchool,
    unsuspendSchool,
    triggerLocalTunnelTransfer,
  }
})

export const useSuperAdminStore = useSuperTenantStore
