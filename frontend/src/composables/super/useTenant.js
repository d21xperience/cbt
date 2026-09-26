// src/composables/super/useTenant.js
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'
import { getTenantSlug } from '@/utils/tenant'
import { normalizeJenjang } from '@/domain/school/jenjang'

const DEFAULT_CONFIG = {
  school_name: 'CBT Engine',
  logo_url: '',
  is_suspended: false,
  jenjang: null,
  program_duration_years: 3,
}

export function useTenant() {
  const $q = useQuasar()
  const checkingTenant = ref(true)
  const schoolTitle = ref('')
  const displayLogo = ref('')
  const isSuspended = ref(false)
  const jenjang = ref(null)
  const programDurationYears = ref(3)

  const applyDefault = () => {
    schoolTitle.value = DEFAULT_CONFIG.school_name
    displayLogo.value = DEFAULT_CONFIG.logo_url
    isSuspended.value = DEFAULT_CONFIG.is_suspended
    jenjang.value = DEFAULT_CONFIG.jenjang
    programDurationYears.value = DEFAULT_CONFIG.program_duration_years
    checkingTenant.value = false
  }

  const loadTenantConfig = async () => {
    checkingTenant.value = true
    const tenantSlug = getTenantSlug()

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

      // ── VER-007/008: jenjang + duration (verified APPLIED)
      jenjang.value = normalizeJenjang(response.data.jenjang) || null
      const dur = Number(response.data.program_duration_years)
      programDurationYears.value = Number.isFinite(dur) && dur >= 1 && dur <= 6 ? dur : 3

      checkingTenant.value = false
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn('[Tenant] Backend endpoint config belum tersedia — pakai default')
        applyDefault()
        return
      }

      console.error('Tenant Config Error:', err)
      applyDefault()

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
    isSuspended,
    jenjang,
    programDurationYears,
    loadTenantConfig,
  }
}
