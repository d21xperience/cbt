<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card class="q-pa-md text-center" style="width: 400px">
      <q-card-section>
        <q-spinner-dots color="primary" size="50px" />
        <div class="text-h6 q-mt-md">Memproses Login QR...</div>
        <div class="text-caption text-grey-7">Mohon tunggu sebentar</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/AuthService'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

onMounted(async () => {
  const token = route.params.token
  if (!token) {
    $q.notify({ type: 'negative', message: 'Token QR tidak valid' })
    router.replace({ name: 'participant-login' })
    return
  }

  try {
    const res = await AuthService.qrLogin(token)
    const data = res?.data || {}

    // Backend HandleQrLogin mengembalikan { role, token, user, exam_mode }
    // — TIDAK ada field "status". Validasi berdasarkan keberadaan token.
    if (!data.token) {
      throw new Error(data.error || 'Respons login QR tidak valid')
    }

    authStore._persistAuth({
      token: data.token,
      role: data.role || 'PARTICIPANT',
      user: data.user || {},
      examMode: data.exam_mode || '',
    })

    $q.notify({
      type: 'positive',
      message: `Selamat datang, ${data.user?.name || data.user?.nama || 'Peserta'}`,
    })

    router.replace({ name: 'exam-dashboard' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message:
        err.response?.data?.error ||
        err.message ||
        'Gagal login via QR. Kartu mungkin sudah dicabut atau tidak aktif.',
    })
    setTimeout(() => {
      router.replace({ name: 'participant-login' })
    }, 3000)
  }
})
</script>
