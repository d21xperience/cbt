<!-- src/pages/auth/SuperAdminLogin.vue -->
<template>
  <q-page class="flex flex-center bg-blue-grey-10">
    <q-card style="width: 400px; max-width: 90vw" class="shadow-24 rounded-borders">
      <q-card-section class="bg-grey-9 text-white text-center q-pa-lg">
        <div class="text-h6 text-weight-bolder letter-spacing-1">CBT ENGINE CORE</div>
        <div class="text-caption text-grey-4 text-uppercase text-weight-light">
          SaaS Central Infrastructure
        </div>
      </q-card-section>

      <q-card-section class="q-pt-xl q-px-lg">
        <q-form @submit.prevent="onSuperLogin" class="q-gutter-md">
          <q-input
            v-model="username"
            label="Root Username"
            outlined
            dark
            bg-color="grey-9"
            :rules="[(val) => !!val || 'Kredensial root wajib diisi']"
          >
            <template v-slot:prepend><q-icon name="shield" color="primary" /></template>
          </q-input>

          <PasswordInput
            v-model="password"
            label="Master Password"
            dark
            bg-color="grey-9"
            :rules="[(val) => !!val || 'Kunci master wajib diisi']"
            class="q-mb-lg"
          />

          <div class="q-pt-sm">
            <q-btn
              label="Aktivasi Sesi Sistem"
              type="submit"
              color="primary"
              class="full-width text-weight-bold"
              :loading="loading"
              size="lg"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pb-md">
        <div class="text-caption text-grey-5">
          IP Terdeteksi: <span class="text-weight-bold text-grey-4">127.0.0.1 (Local Node)</span>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import PasswordInput from '@/components/ui/PasswordInput.vue'

const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

const onSuperLogin = async () => {
  loading.value = true
  try {
    // Pakai auth store → AuthService → POST /auth/super/login (tanpa /api/v1/cbt prefix)
    const result = await auth.login(
      { username: username.value, password: password.value },
      'SUPER_ADMIN',
    )

    if (!result.success) {
      $q.notify({
        type: 'negative',
        icon: 'error',
        message: result.error || 'Akses ditolak. Kredensial root tidak cocok.',
      })
      return
    }

    $q.notify({
      type: 'positive',
      icon: 'verified_user',
      message: 'Sesi kendali pusat berhasil diaktifkan!',
    })

    // Redirect ke dashboard super admin (route existing: /super)
    router.push('/super')
  } catch (err) {
    console.error('[SuperAdminLogin] error:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Terjadi kesalahan. Coba lagi.',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.letter-spacing-1 {
  letter-spacing: 1px;
}
</style>
