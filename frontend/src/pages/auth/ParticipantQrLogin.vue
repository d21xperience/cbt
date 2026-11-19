<!-- <template>
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
    if (res.data.status === 'ok') {
      // Persist auth state secara manual karena ini login via QR (bukan via form)
      authStore._persistAuth({
        token: res.data.token,
        role: 'PARTICIPANT',
        user: res.data.user,
        examMode: res.data.exam_mode || ''
      })

      $q.notify({ type: 'positive', message: `Selamat datang, ${res.data.user.nama}` })

      // Redirect ke dashboard peserta (sesuaikan nama route jika berbeda, misal: 'exam-dashboard' atau 'participant-home')
      router.replace({ name: 'exam-dashboard' })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Gagal login via QR. Kartu mungkin sudah dicabut atau tidak aktif.'
    })
    setTimeout(() => {
      router.replace({ name: 'participant-login' })
    }, 3000)
  }
})
</script> -->
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
    if (res.data.status === 'ok') {
      // Persist auth state secara manual untuk login via QR
      authStore._persistAuth({
        token: res.data.token,
        role: 'PARTICIPANT',
        user: res.data.user,
        examMode: res.data.exam_mode || ''
      })

      $q.notify({ type: 'positive', message: `Selamat datang, ${res.data.user.nama || 'Peserta'}` })

      // Redirect ke dashboard peserta (sesuaikan nama route jika di proyek Anda berbeda, misal: 'exam-dashboard')
      router.replace({ name: 'exam-dashboard' })
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Gagal login via QR. Kartu mungkin sudah dicabut atau tidak aktif.'
    })
    setTimeout(() => {
      router.replace({ name: 'participant-login' })
    }, 3000)
  }
})
</script>
