<!-- src/pages/auth/AdminLogin.vue -->
<template>
  <q-page class="flex flex-center bg-grey-3">
    <!-- Tampilan Loading Pengecekan Subdomain Pertama Kali -->
    <div v-if="checkingTenant" class="text-center">
      <q-spinner-cube color="primary" size="5.5em" />
      <div class="text-subtitle1 text-grey-8 q-mt-md text-weight-medium">Memverifikasi Infrastruktur Sekolah...</div>
    </div>
    <!-- 2. KEADAAN DIBLOKIR: Sekolah ditangguhkan oleh Super Admin -->
    <div v-else-if="isSuspended" class="text-center q-pa-xl" style="max-width: 500px;">
      <q-icon name="gavel" color="negative" size="100px" />
      <div class="text-h4 text-negative q-mt-md text-weight-bold">Akses Ditangguhkan</div>
      <div class="text-subtitle1 text-grey-7 q-mt-sm">
        Sekolah ini sedang dalam masa penangguhan oleh administrator pusat.
      </div>
      <q-separator class="q-my-md" />
      <div class="text-body2 text-grey-6">
        Silakan hubungi tim super admin untuk informasi lebih lanjut.
        <br>
        <span class="text-caption">(Kode: TENANT_SUSPENDED)</span>
      </div>
      <q-btn class="q-mt-lg" color="primary" outline label="Kembali ke Beranda" icon="home"
        @click="$router.push('/')" />
    </div>
    <!-- Tampilan Utama Form Login Jika Tenant Valid -->
    <q-card v-else style="width: 380px; max-width: 90vw;" class="shadow-2 rounded-borders">
      <q-card-section class="bg-primary text-white text-center q-pa-md">
        <q-icon name="apartment" size="md" class="q-mb-xs" />
        <div class="text-h6 text-weight-bold">{{ schoolTitle }}</div>
        <div class="text-caption text-blue-2">Panel Manajemen Proktor / Admin CBT</div>
      </q-card-section>

      <q-card-section class="q-pt-lg">
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input v-model="username" label="Username Admin" outlined stack-label dense
            :rules="[val => !!val || 'Username proktor wajib diisi']">
            <template v-slot:prepend><q-icon name="person" /></template>
          </q-input>

          <PasswordInput v-model="password" label="Kata Sandi Admin" dense
            :rules="[val => !!val || 'Password wajib diisi']" class="q-mb-md" />

          <div>
            <q-btn label="Masuk ke Dashboard" type="submit" color="primary" class="full-width" :loading="loading" />
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-md">
        <q-btn flat no-caps label="Beralih Ke Login Peserta Ujian" color="primary" icon="launch"
          :to="{ name: 'participant-login', query: $route.query }" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useTenant } from '@/composables/super/useTenant';

import PasswordInput from '@/components/ui/PasswordInput.vue'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
// eslint-disable-next-line no-unused-vars
const { checkingTenant, schoolTitle, displayLogo, loadTenantConfig, isSuspended } = useTenant();

// State Reaktif Multi-Tenant

const username = ref('')
const password = ref('')
const loading = ref(false)
const schoolName = ref('CBT Engine Management')
// Siklus Hidup: Validasi DNS Subdomain Sekolah Sesaat Sebelum Form Ditampilkan
onMounted(async () => {
  authStore.clearSession();
  // 2. Load konfigurasi tenant (logo, nama sekolah)
  await loadTenantConfig();
})

const onSubmit = async () => {
  loading.value = true
  try {
    const tes = await authStore.login({
      username: username.value,
      password: password.value
    }, 'ADMIN')
    // Sesuai kode logika bawaan Anda (jika !tes berarti sukses)
    if (!tes) {
      $q.notify({ type: 'positive', message: `Selamat datang di panel admin ${schoolName.value}! 😁` })
      router.push('/admin')
    }
  } catch (err) {
    console.log(err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Login gagal. Periksa kembali kredensial proktor Anda.'
    })
  } finally {
    loading.value = false
  }
}
</script>
