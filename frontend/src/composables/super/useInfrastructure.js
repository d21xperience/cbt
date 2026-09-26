// src/composables/super/useInfrastructure.js
//
// Composable: UI orchestration untuk halaman Infrastructure.
// Responsibility:
//   - state 3 resource: vps, domains, tlsCerts
//   - CRUD orchestration
//   - expiry status derivation (presentation concern)
//   - summary computation
//
// BUKAN responsibility:
//   - business rule
//   - HTTP detail (delegasi ke InfrastructureService)

import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { InfrastructureService } from '@/services/super/InfrastructureService'

export function useInfrastructure() {
  const $q = useQuasar()

  // ── State
  const vps = ref([])
  const domains = ref([])
  const tlsCerts = ref([])

  const loading = ref({ vps: false, domains: false, tls: false })
  const submitting = ref(false)
  const errorState = ref(null)

  // ── Load
  const loadResource = async (resource, targetRef) => {
    loading.value[resource] = true
    try {
      const res = await InfrastructureService.list(resource)
      const data = res?.data
      if (!Array.isArray(data)) {
        errorState.value = 'contract_mismatch'
        return
      }
      targetRef.value = data
      errorState.value = null
    } catch (error) {
      const status = error?.response?.status
      if (status === 404) errorState.value = 'endpoint_not_ready'
      else if (!error.response) errorState.value = 'network_error'
      else errorState.value = 'server_error'
      console.warn(`[useInfrastructure] load ${resource} failed:`, error.message)
    } finally {
      loading.value[resource] = false
    }
  }

  const loadVps = () => loadResource('vps', vps)
  const loadDomains = () => loadResource('domains', domains)
  const loadTls = () => loadResource('tls', tlsCerts)
  const loadAll = () => Promise.all([loadVps(), loadDomains(), loadTls()])

  // ── CRUD
  const createResource = async (resource, payload, reloadFn) => {
    submitting.value = true
    try {
      await InfrastructureService.create(resource, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil disimpan.' })
      await reloadFn()
      return { success: true }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message:
          error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  const updateResource = async (resource, id, payload, reloadFn) => {
    submitting.value = true
    try {
      await InfrastructureService.update(resource, id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diperbarui.' })
      await reloadFn()
      return { success: true }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message:
          error.response?.data?.message || error.response?.data?.error || 'Gagal memperbarui data.',
      })
      return { success: false }
    } finally {
      submitting.value = false
    }
  }

  const deleteResource = async (resource, id, reloadFn) => {
    try {
      await InfrastructureService.remove(resource, id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus.' })
      await reloadFn()
      return { success: true }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: error.response?.data?.error || 'Gagal menghapus data.',
      })
      return { success: false }
    }
  }

  // ── Expiry derivation (presentation, bukan business rule)
  const computeExpiryStatus = (dateStr) => {
    if (!dateStr) return { status: 'unknown', days_left: null }
    const now = Date.now()
    const expiry = new Date(dateStr).getTime()
    if (!Number.isFinite(expiry)) return { status: 'unknown', days_left: null }

    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { status: 'expired', days_left: daysLeft }
    if (daysLeft <= 30) return { status: 'expiring_soon', days_left: daysLeft }
    return { status: 'active', days_left: daysLeft }
  }

  const summaryOf = (list) => {
    const arr = Array.isArray(list) ? list : []
    let active = 0
    let expiring_soon = 0
    let expired = 0
    arr.forEach((item) => {
      const { status } = computeExpiryStatus(item.tanggal_expiry)
      if (status === 'active') active += 1
      else if (status === 'expiring_soon') expiring_soon += 1
      else if (status === 'expired') expired += 1
    })
    return { total: arr.length, active, expiring_soon, expired }
  }

  onMounted(() => {
    loadAll()
  })

  return {
    // state
    vps,
    domains,
    tlsCerts,
    loading,
    submitting,
    errorState,
    // loaders
    loadVps,
    loadDomains,
    loadTls,
    loadAll,
    // CRUD
    createResource,
    updateResource,
    deleteResource,
    // presentation helpers
    computeExpiryStatus,
    summaryOf,
  }
}
