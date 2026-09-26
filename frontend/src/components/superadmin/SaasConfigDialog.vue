<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 600px; max-width: 95vw">
      <!-- Header -->
      <q-card-section class="row items-center bg-indigo-9 text-white">
        <div>
          <div class="text-h6 text-weight-bold">Konfigurasi Teknis SaaS</div>
          <div class="text-caption text-indigo-2">Tenant ID: {{ schoolId }}</div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- Isi Form -->
      <q-card-section class="q-gutter-md q-pt-md">
        <!-- Section 1: Paket & Alokasi Kuota -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="layers" class="q-mr-xs" size="xs" /> Paket & Alokasi Resource Server
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select v-model="config.package_tier" :options="tierOptions" label="Tiering Paket" outlined dense
              emit-value map-options />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model.number="config.max_active_students" type="number" label="Maksimal Siswa Aktif Ujian"
              outlined dense :min="50" :max="10000" :step="50" :rules="[
                (v) => (v >= 50 && v <= 10000) || 'Kuota antara 50-10.000',
              ]" hint="50 – 10.000 siswa" />
          </div>
        </div>

        <q-separator class="q-my-sm" />
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select v-model="config.package_tier" :options="tierOptions" label="Tiering Paket" outlined dense
              emit-value map-options />
          </div>
          <div class="col-12 col-sm-6">
            <q-input :model-value="config.billing_type === 'PER_EXAM' ? 'Per Ujian' : 'Bulanan'" label="Tipe Billing"
              outlined dense readonly hint="Ubah tipe billing via form registrasi/edit" />
          </div>
        </div>
        <q-separator class="q-my-sm" />

        <!-- Section 2: DNS & Domain Routing -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="dns" class="q-mr-xs" size="xs" /> Routing & Akses Domain
        </div>

        <div class="q-gutter-sm">
          <q-radio v-model="config.domain_mode" val="SUBDOMAIN" label="Gunakan Subdomain Utama" color="indigo" />
          <q-radio v-model="config.domain_mode" val="CUSTOM_DOMAIN" label="Gunakan Custom Domain Sendiri"
            color="indigo" />
        </div>

        <q-input v-if="config.domain_mode === 'SUBDOMAIN'" v-model="config.subdomain" label="Subdomain Aplikasi"
          outlined dense suffix=".ujian.pw" />

        <q-input v-if="config.domain_mode === 'CUSTOM_DOMAIN'" v-model="config.custom_domain"
          label="Custom Domain Sekolah" outlined dense placeholder="contoh: cbt.sekolah.sch.id">
          <template v-slot:prepend>
            <q-icon name="language" />
          </template>
        </q-input>

        <q-separator class="q-my-sm" />

        <!-- Section 3: Modul Engine -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="tune" class="q-mr-xs" size="xs" /> Fitur Tambahan & Modul Engine
        </div>

        <div class="bg-grey-1 q-pa-sm rounded-borders">
          <q-list dense>
            <q-item tag="label" v-ripple>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  Modul Proctoring AI (Webcam Audit)
                </q-item-label>
                <q-item-label caption>
                  Memakan resource VPS tinggi untuk deteksi kecurangan.
                </q-item-label>
              </q-item-section>
              <q-item-section avatar>
                <q-toggle v-model="config.allowed_features.proctoring_ai" color="green" />
              </q-item-section>
            </q-item>

            <q-item tag="label" v-ripple>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  Evaluator Code Linting (Soal Coding)
                </q-item-label>
                <q-item-label caption>
                  Mengaktifkan fitur pengetikan skrip kode program interaktif.
                </q-item-label>
              </q-item-section>
              <q-item-section avatar>
                <q-toggle v-model="config.allowed_features.coding_question" color="green" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Status Blokir Tenant -->
        <q-banner dense rounded class="bg-red-1 text-red-9 border-red">
          <div class="row items-center justify-between no-wrap">
            <div class="text-caption text-weight-bold">
              Status Penangguhan Dampak Sistem (Suspend Tenant)
            </div>
            <q-toggle v-model="config.is_suspended" color="red" keep-color />
          </div>
        </q-banner>
      </q-card-section>

      <!-- Tombol Aksi -->
      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" v-close-popup color="grey-7" />
        <q-btn color="indigo-9" label="Simpan Parameter SaaS" :loading="saving" @click="saveSaasConfig" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'

const props = defineProps({
  modelValue: Boolean,
  schoolId: String,
})

const emit = defineEmits(['update:modelValue', 'success'])
const $q = useQuasar()

const isOpen = ref(false)
const saving = ref(false)

// ── DEFAULT_CONFIG — baseline supaya field yang tidak dikirim backend
//    tetap terdefinisi (mencegah undefined di template).
const DEFAULT_CONFIG = {
  domain_mode: 'SUBDOMAIN',
  custom_domain: '',
  subdomain: '',
  package_tier: 'BASIC',                // ← BARU
  billing_type: 'MONTHLY',
  max_active_students: 500,             // ← GANTI dari 200 → 500
  allowed_features: {
    proctoring_ai: false,
    coding_question: false,
  },
  is_suspended: false,
}

const config = ref({
  ...DEFAULT_CONFIG,
  allowed_features: { ...DEFAULT_CONFIG.allowed_features },
})

const tierOptions = [
  { label: 'Basic', value: 'BASIC' },
  { label: 'VIP', value: 'VIP' },
  { label: 'Premium', value: 'PREMIUM' },
]

// Sinkronisasi status buka/tutup dialog
watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val && props.schoolId) {
      loadCurrentConfig()
    }
  },
)

watch(isOpen, (val) => emit('update:modelValue', val))

/**
 * Load config dari backend.
 * Merge dengan DEFAULT_CONFIG supaya field yang tidak dikirim backend
 * (mis. allowed_features, domain_mode) tidak jadi undefined.
 *
 * BACKEND DEPENDENCY: endpoint saat ini hanya return
 *   { slug, npsn, school_name, jenjang, program_duration_years,
 *     logo_url, is_suspended, is_active }
 * Field SaaS-specific (domain_mode, package_tier, allowed_features)
 * belum tersedia — perlu VER request.
 */
const loadCurrentConfig = async () => {
  try {
    const response = await TenantService.getSaaSConfig(props.schoolId)
    const data = response?.data && typeof response.data === 'object' ? response.data : {}

    // Merge dengan DEFAULT + normalisasi field
    config.value = {
      ...DEFAULT_CONFIG,
      ...data,
      // ── Normalisasi: backend pakai `max_active_students`, kita pakai konsisten
      max_active_students: Number(data.max_active_students) || DEFAULT_CONFIG.max_active_students,
      package_tier: data.package_tier || DEFAULT_CONFIG.package_tier,
      allowed_features: {
        ...DEFAULT_CONFIG.allowed_features,
        ...(data.allowed_features || {}),
      },
    }
  } catch (error) {
    console.log('[SaasConfigDialog] load failed:', error)
    config.value = {
      ...DEFAULT_CONFIG,
      allowed_features: { ...DEFAULT_CONFIG.allowed_features },
    }
    $q.notify({
      type: 'negative',
      message: 'Gagal mengambil parameter konfigurasi SaaS.',
    })
  }
}

const saveSaasConfig = async () => {
  saving.value = true
  try {
    await TenantService.saveSaaSConfig(props.schoolId, {
      subdomain: config.value.subdomain,
      package_tier: config.value.package_tier,
      billing_type: config.value.billing_type,
      max_active_students: config.value.max_active_students,
      domain_mode: config.value.domain_mode,
      custom_domain: config.value.custom_domain,
      allowed_features: config.value.allowed_features,
      is_suspended: config.value.is_suspended,
    })
    $q.notify({
      type: 'positive',
      message: 'Parameter SaaS berhasil disinkronkan ke server pusat!',
    })
    emit('success')
    isOpen.value = false
  } catch (error) {
    console.log('[SaasConfigDialog] save failed:', error)
    $q.notify({
      type: 'negative',
      message: 'Gagal memperbarui data konfigurasi server.',
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.border-red {
  border: 1px dashed #f44336;
}
</style>
