import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/boot/axios'
import { Loading } from 'quasar'

export const useSuperTenantStore = defineStore('superTenant', () => {
  const schoolList = ref([])
  const globalStats = ref({
    total_schools: 0,
    active_exams: 0,
    total_participants_online: 0,
    vps_cpu_estimate: 0,
  })

  const fetchSchools = async () => {
    try {
      const res = await api.get('/api/v1/cbt/super/schools')
      schoolList.value = res.data
    } catch (err) {
      console.error('Gagal mengambil data sekolah:', err)
    }
  }

  const triggerLocalTunnelTransfer = async (schoolId) => {
    Loading.show({ message: 'Membuat paket enkripsi data & membuka Cloudflare Tunnel...' })
    try {
      await api.post('/cbt/super/archive/tunnel-transfer', { school_id: schoolId })
      return true
    } catch {
      return false
    } finally {
      Loading.hide()
    }
  }

  return { schoolList, globalStats, fetchSchools, triggerLocalTunnelTransfer }
})
