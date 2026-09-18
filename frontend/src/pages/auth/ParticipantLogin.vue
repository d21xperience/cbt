<template>
  <q-page class="flex flex-center bg-grey-1">
    <div v-if="checkingTenant" class="text-center">
      <q-spinner-grid color="primary" size="4em" />
      <div class="text-subtitle2 text-grey-7 q-mt-md">Menghubungkan ke server...</div>
    </div>

    <div v-else-if="isSuspended" class="text-center q-pa-xl" style="max-width: 500px">
      <q-icon name="gavel" color="negative" size="100px" />
      <div class="text-h4 text-negative q-mt-md text-weight-bold">Akses Ditangguhkan</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        Hubungi administrator pusat.
      </div>
    </div>

    <q-card v-else style="width: 450px; max-width: 92vw" class="q-pa-sm" :class="{ 'q-mt-xl': $q.screen.gt.xs }">
      <q-card-section class="row items-center q-pb-md">
        <div class="col-3 flex flex-center">
          <q-avatar size="64px">
            <img :src="displayLogo || defaultLogo" alt="Logo" />
          </q-avatar>
        </div>
        <div class="col-9">
          <div class="text-h5 text-weight-bold text-primary">CBT {{ schoolTitle }}</div>
          <div class="text-caption text-grey-7">Masukkan kredensial dari kartu ujian Anda</div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input v-model="username" label="Username" hint="Tertera di kartu ujian (contoh: 12345678)" outlined
            stack-label autocomplete="off" :rules="[(v) => !!v || 'Username wajib diisi']">
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <q-input v-model="password" label="Password" hint="6 karakter dari kartu ujian" outlined stack-label
            :type="showPwd ? 'text' : 'password'" autocomplete="off" :rules="[(v) => !!v || 'Password wajib diisi']">
            <template v-slot:prepend>
              <q-icon name="vpn_key" />
            </template>
            <template v-slot:append>
              <q-icon :name="showPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                @click="showPwd = !showPwd" />
            </template>
          </q-input>

          <q-btn label="Masuk Ruang Ujian" type="submit" color="primary" class="full-width text-weight-bold"
            :loading="loading" size="lg" />
        </q-form>
      </q-card-section>

      <q-card-actions align="center" class="q-pt-none q-pb-md justify-between">
        <q-btn flat no-caps label="Bantuan" color="grey-7" icon="help_outline" @click="showHelp" />
        <q-btn flat no-caps label="Mode Proktor" color="primary" icon="shield"
          :to="{ name: 'teacher-login', query: $route.query }" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useTenant } from '@/composables/super/useTenant'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const { checkingTenant, schoolTitle, displayLogo, loadTenantConfig, isSuspended } = useTenant()

const username = ref('')
const password = ref('')
const showPwd = ref(false)
const loading = ref(false)
const defaultLogo = 'https://cdn.quasar.dev/logo-v2/svg/logo.svg'

onMounted(async () => {
  authStore.clearSession()
  await loadTenantConfig()
})

const onSubmit = async () => {
  loading.value = true
  try {
    const res = await authStore.participantLogin({
      username: username.value.trim(),
      password: password.value.trim(),
    })

    if (res.success) {
      $q.notify({ type: 'positive', message: 'Login berhasil!', position: 'top' })
      router.push({ name: 'waiting-room' })
    } else {
      throw new Error(res.error || 'Server bermasalah')
    }
  } catch (err) {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Gagal masuk. Periksa username & password.'
    $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
  } finally {
    loading.value = false
  }
}

const showHelp = () => {
  $q.dialog({
    title: 'Panduan Login',
    message:
      '1. Isi Username sesuai kartu ujian.\n' +
      '2. Isi Password 6 karakter dari kartu.\n' +
      '3. Hubungi proktor jika kartu hilang.',
    persistent: true,
    ok: 'Saya Mengerti',
  })
}
</script>
