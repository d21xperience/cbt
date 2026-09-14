// src/composables/usePortalDirectory.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService as PortalService } from '@/services/super/TenantService'

export function usePortalDirectory() {
  const $q = useQuasar()
  const loading = ref(false)
  const schools = ref([])
  const searchQuery = ref('')

  // Filter berdasarkan nama atau kota (case-insensitive)
  const filteredSchools = computed(() => {
    if (!searchQuery.value.trim()) return schools.value
    const query = searchQuery.value.toLowerCase()
    return schools.value.filter(
      (school) =>
        school.name?.toLowerCase().includes(query) || school.city?.toLowerCase().includes(query),
    )
  })

  // Load data dari API
  const loadSchools = async () => {
    loading.value = true
    try {
      const response = await PortalService.getSchools()
      console.log('📢-loadSchools', response)
      schools.value = response.data
    } catch (error) {
      console.error('Gagal mengambil direktori sekolah:', error)
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
    loadSchools, // Expose agar bisa dipanggil ulang jika perlu
  }
}
