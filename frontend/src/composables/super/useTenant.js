// src/composables/super/useTenant.js
// Single-tenant graceful: skip tenant fetch jika slug invalid atau endpoint belum ada
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'
import { getTenantSlug } from '@/utils/tenant'

const DEFAULT_CONFIG = {
  school_name: 'CBT Engine',
  logo_url: '',
  is_suspended: false,
}

export function useTenant() {
  const $q = useQuasar()
  const checkingTenant = ref(true)
  const schoolTitle = ref('')
  const displayLogo = ref('')
  const isSuspended = ref(false)

  const applyDefault = () => {
    schoolTitle.value = DEFAULT_CONFIG.school_name
    displayLogo.value = DEFAULT_CONFIG.logo_url
    isSuspended.value = DEFAULT_CONFIG.is_suspended
    checkingTenant.value = false
  }

  const loadTenantConfig = async () => {
    checkingTenant.value = true
    const tenantSlug = getTenantSlug()

    // Guard #1: single-tenant deployment — skip fetch jika slug invalid
    if (!tenantSlug || tenantSlug === 'null' || tenantSlug === 'undefined') {
      console.info('[Tenant] Slug tidak valid — pakai konfigurasi default')
      applyDefault()
      return
    }

    try {
      const response = await TenantService.getConfig(tenantSlug)

      if (response.data.is_suspended) {
        isSuspended.value = true
        throw new Error('Akses ujian sekolah ini ditangguhkan sementara oleh pusat.')
      }

      schoolTitle.value = response.data.school_name || DEFAULT_CONFIG.school_name
      displayLogo.value = response.data.logo_url || DEFAULT_CONFIG.logo_url
      checkingTenant.value = false
    } catch (err) {
      // Guard #2: endpoint belum ada → fallback ke default, JANGAN block UI
      if (err.response?.status === 404) {
        console.warn('[Tenant] Backend endpoint config belum tersedia — pakai default')
        applyDefault()
        return
      }

      // Guard #3: error lain (network, dsb.) → tetap izinkan UI render
      console.error('Tenant Config Error:', err)
      applyDefault()

      // Notif hanya untuk error yang benar-benar penting (bukan network biasa)
      if (err.response?.status >= 500) {
        $q.notify({
          type: 'warning',
          position: 'top',
          message: 'Tidak dapat memuat info sekolah. Menggunakan pengaturan default.',
        })
      }
    }
  }

  return {
    checkingTenant,
    schoolTitle,
    displayLogo,
    loadTenantConfig,
    isSuspended,
  }
}
