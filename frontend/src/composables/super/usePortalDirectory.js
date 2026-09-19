// src/composables/super/usePortalDirectory.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService as PortalService } from '@/services/super/TenantService'

export function usePortalDirectory() {
  const $q = useQuasar()
  const loading = ref(false)
  const schools = ref([])
  const searchQuery = ref('')

  function normalizeSchools(raw) {
    if (Array.isArray(raw)) return raw
    if (raw && Array.isArray(raw.data)) return raw.data
    if (raw && typeof raw === 'object') {
      console.warn('[PortalDirectory] Response bukan array:', raw)
      return []
    }
    return []
  }

  const filteredSchools = computed(() => {
    const list = Array.isArray(schools.value) ? schools.value : []
    if (!searchQuery.value.trim()) return list

    const query = searchQuery.value.toLowerCase()
    return list.filter(
      (school) =>
        (school?.school_name || '').toLowerCase().includes(query) ||
        (school?.npsn || '').toLowerCase().includes(query) ||
        (school?.subdomain || '').toLowerCase().includes(query),
    )
  })

  const loadSchools = async () => {
    loading.value = true
    try {
      const response = await PortalService.getPublicSchools()
      const extracted = normalizeSchools(response?.data)
      schools.value = extracted
      console.info(`[PortalDirectory] Loaded ${extracted.length} schools`)
    } catch (error) {
      console.error('[PortalDirectory] loadSchools error:', error)
      schools.value = []
      $q.notify({
        type: 'negative',
        message: 'Gagal memuat daftar sekolah. Silakan refresh halaman.',
        position: 'top',
        timeout: 5000,
      })
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    schools,
    searchQuery,
    filteredSchools,
    loadSchools,
  }
}
