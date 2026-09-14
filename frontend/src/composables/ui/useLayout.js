// src/composables/useLayout.js
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQuasar } from 'quasar'

export function useLayout() {
  const router = useRouter()
  const authStore = useAuthStore()
  const $q = useQuasar()

  const leftDrawerOpen = ref(false)

  const toggleDrawer = () => {
    leftDrawerOpen.value = !leftDrawerOpen.value
  }

  const confirmLogout = () => {
    $q.dialog({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar?',
      persistent: true,
      ok: { label: 'Keluar', color: 'primary' },
      cancel: { label: 'Batal', color: 'grey' },
    }).onOk(() => {
      authStore.logout()
      router.push({ name: 'participant-login' })
    })
  }

  const handleRefresh = async (callback) => {
    if (typeof callback === 'function') {
      await callback()
    }
  }

  return {
    leftDrawerOpen,
    toggleDrawer,
    confirmLogout,
    handleRefresh,
  }
}
