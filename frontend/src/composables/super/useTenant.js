// src/composables/useTenant.js
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'
import { getTenantSlug } from '@/utils/tenant'

export function useTenant() {
  const $q = useQuasar()
  const checkingTenant = ref(true)
  const schoolTitle = ref('')
  const displayLogo = ref('')
  const isSuspended = ref(false)
  const loadTenantConfig = async () => {
    const tenantSlug = getTenantSlug()
    checkingTenant.value = true

    try {
      const response = await TenantService.getConfig(tenantSlug)
      // Cek status blokir dari superadmin pusat
      if (response.data.is_suspended) {
        isSuspended.value = true
        throw new Error('Akses ujian sekolah ini ditangguhkan sementara oleh pusat.')
      }

      // Sinkronisasi data visual
      schoolTitle.value = response.data.school_name || 'SMK Anda'
      displayLogo.value = response.data.logo_url || 'https://placeholder.com'
      checkingTenant.value = false
    } catch (err) {
      console.error('Tenant Config Error:', err)
      $q.notify({
        type: 'negative',
        timeout: 0,
        position: 'top',
        actions: [{ label: 'Mengerti', color: 'white' }],
        message: err.message || `Cluster sekolah '${tenantSlug}' tidak dikenali sistem SaaS pusat.`,
      })
      // Jangan set checkingTenant = false di sini agar form tidak muncul jika error
      // Tapi agar tidak stuck loading, kita set false tetap
      checkingTenant.value = false
    }
  }

  // Bisa dipanggil manual atau otomatis di onMounted
  return {
    checkingTenant,
    schoolTitle,
    displayLogo,
    loadTenantConfig,
    isSuspended,
  }
}
