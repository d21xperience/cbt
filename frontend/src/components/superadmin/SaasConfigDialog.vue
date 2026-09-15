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
            <q-select
              v-model="config.package_tier"
              :options="tierOptions"
              label="Tiering Paket"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-sm-6">
            <div class="text-caption text-grey-7 q-mb-xs">
              Maksimal Siswa Aktif Ujian: <strong>{{ config.max_active_students }}</strong>
            </div>
            <!-- Slider pengontrol RAM VPS agar presisi -->
            <q-slider
              v-model="config.max_active_students"
              :min="50"
              :max="1000"
              :step="50"
              label
              color="indigo"
            />
          </div>
        </div>

        <q-separator q-my-sm />

        <!-- Section 2: DNS & Domain Routing -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="dns" class="q-mr-xs" size="xs" /> Routing & Akses Domain
        </div>

        <div class="q-gutter-sm">
          <q-radio
            v-model="config.domain_mode"
            val="SUBDOMAIN"
            label="Gunakan Subdomain Utama"
            color="indigo"
          />
          <q-radio
            v-model="config.domain_mode"
            val="CUSTOM_DOMAIN"
            label="Gunakan Custom Domain Sendiri"
            color="indigo"
          />
        </div>

        <!-- Tampilan Kondisional Input Domain -->
        <q-input
          v-if="config.domain_mode === 'SUBDOMAIN'"
          v-model="config.subdomain"
          label="Subdomain Aplikasi"
          outlined
          dense
          suffix=".ulangan.co.id"
        />

        <!-- <q-input v-slot:prepend v-if="config.domain_mode === 'CUSTOM_DOMAIN'" v-model="config.custom_domain"
          label="Custom Domain Sekolah" outlined dense placeholder="contoh: cbt.sekolah.sch.id">
          <template v-slot:prepend>
            <q-icon name="language" />
          </template>
        </q-input> -->

        <q-separator q-my-sm />

        <!-- Section 3: Pembatasan Fitur Berat (Hemat RAM) -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="tune" class="q-mr-xs" size="xs" /> Fitur Tambahan & Modul Engine
        </div>

        <div class="bg-grey-1 q-pa-sm rounded-borders">
          <q-list dense>
            <q-item tag="label" v-ripple>
              <q-item-section>
                <q-item-label class="text-weight-medium"
                  >Modul Proctoring AI (Webcam Audit)</q-item-label
                >
                <q-item-label caption
                  >Memakan resource VPS tinggi untuk deteksi kecurangan.</q-item-label
                >
              </q-item-section>
              <q-item-section avatar>
                <q-toggle v-model="config.allowed_features.proctoring_ai" color="green" />
              </q-item-section>
            </q-item>

            <q-item tag="label" v-ripple>
              <q-item-section>
                <q-item-label class="text-weight-medium"
                  >Evaluator Code Linting (Soal Coding)</q-item-label
                >
                <q-item-label caption
                  >Mengaktifkan fitur pengetikan skrip kode program interaktif.</q-item-label
                >
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
        <q-btn
          color="indigo-9"
          label="Simpan Parameter SaaS"
          :loading="saving"
          @click="saveSaasConfig"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { api } from '@/boot/axios'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
  schoolId: String,
})

const emit = defineEmits(['update:modelValue', 'success'])
const $q = useQuasar()

const isOpen = ref(false)
const saving = ref(false)

const config = ref({
  domain_mode: 'SUBDOMAIN',
  custom_domain: '',
  subdomain: '',
  package_tier: 'BASIC',
  max_active_students: 200,
  allowed_features: {
    proctoring_ai: false,
    coding_question: false,
  },
  is_suspended: false,
})

const tierOptions = [
  { label: 'Paket Reguler / Basic', value: 'BASIC' },
  { label: 'Paket Menengah / VIP', value: 'VIP' },
  { label: 'Paket Korporat / PREMIUM', value: 'PREMIUM' },
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

// Muat data pengaturan terkini dari server lewat API
const loadCurrentConfig = async () => {
  try {
    const response = await api.get(`/api/v1/cbt/superadmin/schools/${props.schoolId}/config`)
    config.value = response.data
  } catch (error) {
    console.log(error)

    $q.notify({ type: 'negative', message: 'Gagal mengambil parameter konfigurasi SaaS.' })
  }
}

// Kirim pembaruan menuju server
const saveSaasConfig = async () => {
  saving.value = true
  try {
    await api.post(`/api/v1/cbt/superadmin/schools/${props.schoolId}/config`, config.value)
    $q.notify({
      type: 'positive',
      message: 'Parameter SaaS berhasil disinkronkan ke server pusat!',
    })
    emit('success')
    isOpen.value = false
  } catch (error) {
    console.log(error)
    $q.notify({ type: 'negative', message: 'Gagal memperbarui data konfigurasi server.' })
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
