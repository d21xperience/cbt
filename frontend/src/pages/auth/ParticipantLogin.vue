<!-- src/pages/auth/ParticipantLogin.vue -->
<template>
  <q-page class="flex flex-center bg-grey-1">
    <!-- Tampilan Loading Sinkronisasi DNS Subdomain -->
    <div v-if="checkingTenant" class="text-center">
      <q-spinner-grid color="primary" size="4em" />
      <div class="text-subtitle2 text-grey-7 q-mt-md">Menghubungkan ke Cluster Server Sekolah...</div>
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
    <!-- Tampilan Utama Form Login Peserta Ujian -->
    <q-card v-else style="width: 450px; max-width: 92vw;" class="q-pa-sm" :class="{ 'q-mt-xl': $q.screen.gt.xs }">
      <!-- Logo & Header Dinamis Berbasis Tenant -->
      <q-card-section class="row items-center q-pb-md">
        <div class="col-3 flex flex-center">
          <q-avatar size="64px" class="">
            <img :src="displayLogo" alt="Logo Instansi Sekolah" />
          </q-avatar>
        </div>
        <div class="col-9">
          <div class="text-h5 text-weight-bold text-primary">CBT {{ schoolTitle }}</div>
          <!-- <div class="text-subtitle2 text-grey-7">Panel Ruang Ujian Online Peserta</div> -->
        </div>
      </q-card-section>

      <q-separator />

      <!-- Form Isian Peserta -->
      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input v-model="participantId" label="Username" outlined stack-label
            :rules="[val => !!val || 'Username wajib diisi']" aria-label="Username">
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <PasswordInput v-model="examIdentifier" label="Passowrd" :rules="[val => !!val || 'Password wajib diisi']"
            class="q-mb-lg" />

          <div>
            <q-btn label="Masuk Ruang Ujian" type="submit" color="primary" class="full-width text-weight-bold"
              :loading="loading" size="lg" aria-label="Masuk ke ruang ujian" />
          </div>
        </q-form>
      </q-card-section>

      <!-- Footer Kontrol -->
      <q-card-actions align="center" class="q-pt-none q-pb-md justify-between">
        <q-btn flat no-caps label="Bantuan Login" color="grey-7" icon="help_outline" size="md" @click="showHelp"
          aria-label="Bantuan" />
        <q-btn flat no-caps label="Mode Proktor" color="primary" icon="shield"
          :to="{ name: 'teacher-login', query: $route.query }" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';
import { useTenant } from '@/composables/super/useTenant';
import PasswordInput from '@/components/ui/PasswordInput.vue';

// --- Instansiasi Dependencies ---
const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

// --- State & Composables ---
const { checkingTenant, schoolTitle, displayLogo, loadTenantConfig, isSuspended } = useTenant();

const participantId = ref('');
const examIdentifier = ref('');
const loading = ref(false);

// --- Lifecycle ---
onMounted(async () => {
  // 1. Bersihkan sesi lama (keamanan)
  authStore.clearSession();
  // 2. Load konfigurasi tenant (logo, nama sekolah)
  await loadTenantConfig();
});
// --- Handler Submit ---
const onSubmit = async () => {
  loading.value = true;
  try {
    const res = await authStore.participantLogin({
      id: participantId.value,
      exam_identifier: examIdentifier.value,
    });
    console.log('📢 res', res)
    if (res.success) {
      $q.notify({
        type: 'positive',
        message: 'Verifikasi sukses, selamat menempuh ujian!',
        position: 'top',
      });
      router.push({ name: 'waiting-room' });
    } else {
      throw new Error('Server bermasalah')
    }
  } catch (err) {
    console.log(err)
    // Tangkap error dari store atau jaringan
    const message = err.response?.data?.message || 'Gagal masuk. Periksa kembali Username dan Password Kartu.';
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
      timeout: 5000,
    });
  } finally {
    loading.value = false;
  }
};

// --- Dialog Bantuan ---
const showHelp = () => {
  $q.dialog({
    title: 'Panduan Masuk Ujian',
    message: '1. Lihat nomor peserta dan sandi pada kartu fisik yang dibagikan proktor.\n' +
      '2. Pastikan penulisan huruf besar dan kecil sesuai.\n' +
      '3. Hubungi pengawas lab sekolah jika nomor Anda mengalami kendala aktivasi.',
    persistent: true,
    ok: 'Saya Mengerti',
  });
};
</script>

<!-- CSS yang TERSISA hanya untuk border logo, karena dark mode diurus otomatis oleh Quasar -->
<style lang="scss" scoped>
.q-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.border-logo {
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

// Quasar otomatis menangani dark mode, cukup hapus manual override .dark-mode
// Jika tetap ingin custom, gunakan global style di app.scss atau body--dark
</style>
