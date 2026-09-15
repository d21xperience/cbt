<!-- src/pages/auth/SuperAdminLogin.vue -->
<template>
  <q-page class="flex flex-center bg-blue-grey-10">
    <q-card style="width: 400px; max-width: 90vw" class="shadow-24 rounded-borders">
      <!-- Header Khusus Superadmin -->
      <q-card-section class="bg-grey-9 text-white text-center q-pa-lg">
        <div class="text-h6 text-weight-bolder letter-spacing-1">CBT ENGINE CORE</div>
        <div class="text-caption text-grey-4 text-uppercase text-weight-light">
          SaaS Central Infrastructure
        </div>
      </q-card-section>

      <!-- Form Pengisian Kredensial -->
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
import { api } from '@/boot/axios'
import PasswordInput from '@/components/ui/PasswordInput.vue'

const router = useRouter()
const $q = useQuasar()

const username = ref('')
const password = ref('')
const loading = ref(false)

const onSuperLogin = async () => {
  loading.value = true
  try {
    const response = await api.post('/api/v1/cbt/auth/superadmin/login', {
      username: username.value,
      password: password.value,
    })

    // Simpan token otorisasi tingkat tinggi ke penyimpanan lokal
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('role', 'SUPERADMIN')

    $q.notify({
      type: 'positive',
      icon: 'verified_user',
      message: 'Sesi kendali pusat berhasil diaktifkan!',
    })

    // Teruskan langsung menuju dashboard utama superadmin
    router.push('/superadmin/dashboard')
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Akses ditolak. Kredensial root tidak cocok.',
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
